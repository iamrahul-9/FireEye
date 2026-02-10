'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Filter, Building, Calendar, BarChart3, CheckSquare, Square, Search, CheckCircle } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { LiquidCard, LiquidButton, LiquidCheckbox } from '@/components/Liquid'
import StatusBadge from '@/components/StatusBadge'
import SearchableSelect from '@/components/SearchableSelect'
import LiquidCalendar from '@/components/LiquidCalendar'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { useToast } from '@/contexts/ToastContext'
import { generateReportPDF } from '@/lib/pdfGenerator'
import SearchFilterBar from '@/components/SearchFilterBar'
import FireEyeLoader from '@/components/FireEyeLoader'

type Client = {
    id: string
    name: string
}

type Inspection = {
    id: string
    date: string
    status: string
    compliance_score: number
    critical_issues_count: number
    inspector: { full_name: string }
    client: { name: string }
}

export default function ReportsPage() {
    const router = useRouter()
    const { showToast } = useToast()
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>('all')
    const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'custom'>('all')
    const [customDateRange, setCustomDateRange] = useState<{ from: Date | null, to: Date | null }>({ from: new Date(), to: null })
    const [showCalendar, setShowCalendar] = useState(false)
    const [inspections, setInspections] = useState<Inspection[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
    const [stats, setStats] = useState({
        total: 0,
        avgScore: 0,
        criticalIssues: 0
    })

    // Universal Search State
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')

    useEffect(() => {
        fetchClients()
        fetchReportData()
    }, [selectedClientId, dateRange, customDateRange])

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name')
        if (data) setClients(data)
    }

    const fetchReportData = async () => {
        setLoading(true)
        let query = supabase
            .from('inspections')
            .select(`
                id,
                date,
                status,
                compliance_score,
                critical_issues_count,
                inspector:profiles(full_name),
                client:clients(name)
            `)
            .order('date', { ascending: false })

        if (selectedClientId !== 'all') {
            query = query.eq('client_id', selectedClientId)
        }

        if (dateRange !== 'all') {
            const now = new Date()
            let startDate: Date

            if (dateRange === '30d') {
                startDate = subDays(now, 30)
                query = query.gte('date', startDate.toISOString())
            } else if (dateRange === '90d') {
                startDate = subDays(now, 90)
                query = query.gte('date', startDate.toISOString())
            } else if (dateRange === 'custom' && customDateRange.from) {
                // Custom Range
                const start = startOfDay(customDateRange.from)
                query = query.gte('date', start.toISOString())

                if (customDateRange.to) {
                    const end = endOfDay(customDateRange.to)
                    query = query.lte('date', end.toISOString())
                }
            }
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching reports:', error)
        } else {
            const result = (data || []) as any[]
            setInspections(result)

            // Calculate Aggregates
            const total = result.length
            const totalScore = result.reduce((acc, curr) => acc + (curr.compliance_score || 0), 0)
            const critical = result.reduce((acc, curr) => acc + (curr.critical_issues_count || 0), 0)

            setStats({
                total,
                avgScore: total > 0 ? Math.round(totalScore / total) : 0,
                criticalIssues: critical
            })
        }
        setLoading(false)
    }

    const filteredInspections = inspections.filter(insp => {
        const matchesSearch =
            (insp.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (insp.inspector?.full_name || '').toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'All' || insp.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedReports)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedReports(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedReports.size === filteredInspections.length) {
            setSelectedReports(new Set())
        } else {
            setSelectedReports(new Set(filteredInspections.map(i => i.id)))
        }
    }

    const handleDownload = async (singleInspection?: Inspection) => {
        try {
            const inspectionsToExport = singleInspection
                ? [singleInspection]
                : inspections.filter(i => selectedReports.has(i.id))

            if (inspectionsToExport.length === 0) {
                showToast('Please select reports to download', 'error')
                return
            }

            showToast(`Preparing ${inspectionsToExport.length} report${inspectionsToExport.length > 1 ? 's' : ''}...`, 'info')

            const ids = inspectionsToExport.map(i => i.id)
            const { data: detailedInspections, error } = await supabase
                .from('inspections')
                .select(`
                    *,
                    client:clients(*),
                    inspector:profiles(full_name, email)
                `)
                .in('id', ids)

            if (error || !detailedInspections) {
                throw new Error('Failed to fetch detailed data for reports')
            }

            if (detailedInspections.length === 1) {
                await generateReportPDF(detailedInspections, `Inspection Report - ${detailedInspections[0].client.name}`)
                showToast('Report downloaded successfully', 'success')
                return
            }

            showToast('Generating ZIP file...', 'info')
            const JSZip = (await import('jszip')).default
            const zip = new JSZip()

            for (const ins of detailedInspections) {
                const blob = await generateReportPDF([ins], `Inspection Report`, true)
                const filename = `${ins.client.name.replace(/\s+/g, '_')}_${new Date(ins.date).toISOString().split('T')[0]}.pdf`
                if (blob) zip.file(filename, blob)
            }

            const content = await zip.generateAsync({ type: 'blob' })

            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)
            link.download = `Inspection_Reports_Batch_${new Date().toISOString().split('T')[0]}.zip`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            showToast('Batch download started!', 'success')
            setSelectedReports(new Set())

        } catch (error) {
            console.error('PDF Generation Error:', error)
            showToast('Failed to generate reports. Please try again.', 'error')
        }
    }

    const getCustomRangeText = () => {
        if (customDateRange.from && customDateRange.to) {
            return `${customDateRange.from.toLocaleDateString()} - ${customDateRange.to.toLocaleDateString()}`
        }
        if (customDateRange.from) {
            return `${customDateRange.from.toLocaleDateString()} - ...`
        }
        return 'Select Range'
    }

    if (loading) {
        return <FireEyeLoader fullscreen text="Loading Reports..." />
    }

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <PageHeader
                title="Compliance Reports"
                subtitle="Analyze inspection data and trends"
                actionLabel={selectedReports.size > 0 ? `Download (${selectedReports.size})` : "Export PDF"}
                actionIcon={Download}
                actionUrl="#"
                onActionClick={() => handleDownload()}
            />

            {/* 1. Unified Filter Bar (Expanded & Breathable) */}
            <div className="liquid-card p-4 !overflow-visible relative z-40">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    {/* Search (Takes substantial space) */}
                    <div className="relative w-full lg:flex-[1.5]">
                        <input
                            type="text"
                            className="liquid-input w-full !pl-10"
                            placeholder="Search reports..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    {/* Filters Group (Fills remaining space) */}
                    <div className="flex flex-col sm:flex-row flex-[2] w-full gap-4">

                        {/* Status Filter */}
                        <div className="relative flex-1">
                            <select
                                className="liquid-input w-full !pl-9 !pr-8 py-2.5 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                <option value="Completed">Completed</option>
                                <option value="Action Required">Action Required</option>
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Client Filter */}
                        <div className="relative flex-[1.5] z-50">
                            <SearchableSelect
                                options={[
                                    { value: 'all', label: 'All Clients' },
                                    ...clients.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                value={selectedClientId}
                                onChange={setSelectedClientId}
                                placeholder="Select Client..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Stats & Filters Layout */}
            {/* Mobile: grid-cols-2 (Side-by-Side 50/50) */}
            {/* Desktop: grid-cols-5 (Stats 60% [3/5], Filters 40% [2/5]) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

                {/* Left: Key Metrics Card (60% on Desktop) */}
                <div className="lg:col-span-3 liquid-card p-0 overflow-hidden flex flex-col lg:flex-row lg:items-stretch lg:divide-x divide-gray-100 dark:divide-white/5">
                    <div className="flex-1 flex items-center justify-between lg:justify-start lg:gap-6 px-4 py-4 lg:py-6 border-b lg:border-b-0 border-gray-100 dark:border-white/5 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider truncate">Total Reports</h3>
                                <p className="text-xl font-black">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-between lg:justify-start lg:gap-6 px-4 py-4 lg:py-6 border-b lg:border-b-0 border-gray-100 dark:border-white/5 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 rounded-lg shrink-0">
                                <BarChart3 className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider truncate">Avg. Score</h3>
                                <p className={`text-xl font-black ${stats.avgScore >= 90 ? 'text-green-500' : 'text-orange-500'}`}>{stats.avgScore}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-between lg:justify-start lg:gap-6 px-4 py-4 lg:py-6 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 rounded-lg shrink-0">
                                <Building className="h-4 w-4 text-red-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider truncate">Critical Issues</h3>
                                <p className="text-xl font-black text-gray-900 dark:text-white">{stats.criticalIssues}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Filters Card (40% on Desktop) */}
                <div className="lg:col-span-2 liquid-card p-4 flex flex-col justify-between h-full">
                    <div className="space-y-3 h-full flex flex-col justify-center">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400">Time Period</span>
                            {dateRange === 'custom' && customDateRange && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {customDateRange.from ? customDateRange.from.toLocaleDateString() : 'Start'} - {customDateRange.to ? customDateRange.to.toLocaleDateString() : 'End'}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Standard Ranges */}
                            {(['all', '30d', '90d'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => {
                                        setDateRange(range)
                                        setShowCalendar(false)
                                    }}
                                    className={`
                                        w-full py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 group
                                        ${dateRange === range && !showCalendar
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 border border-transparent'
                                        }
                                    `}
                                >
                                    <span>{range === 'all' ? 'All Time' : range === '30d' ? '30 Days' : '90 Days'}</span>
                                    {dateRange === range && !showCalendar && <CheckCircle className="h-3 w-3" />}
                                </button>
                            ))}

                            {/* Custom Range Logic */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setDateRange('custom')
                                        setShowCalendar(!showCalendar)
                                    }}
                                    className={`
                                        w-full h-full py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 group
                                        ${dateRange === 'custom' || showCalendar
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 border border-transparent'
                                        }
                                    `}
                                >
                                    <span>Custom</span>
                                    <Calendar className="h-3 w-3 opacity-70" />
                                </button>
                                {showCalendar && (
                                    <div className="absolute top-0 right-full lg:right-0 lg:top-full mt-2 lg:mt-2 z-50 animate-fade-in-right lg:animate-fade-in-down origin-top-right w-[260px]">
                                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-3">
                                            <LiquidCalendar
                                                selectedRange={customDateRange}
                                                onChange={(range) => setCustomDateRange(range)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="liquid-card overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <LiquidCheckbox
                                        checked={selectedReports.size === filteredInspections.length && filteredInspections.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold">Client</th>
                                <th className="px-6 py-4 font-bold">Inspector</th>
                                <th className="px-6 py-4 font-bold">Compliance</th>
                                <th className="px-6 py-4 font-bold">Critical Issues</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading data...</td>
                                </tr>
                            ) : filteredInspections.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No reports found matching your criteria.</td>
                                </tr>
                            ) : (
                                filteredInspections.map((insp) => (
                                    <tr
                                        key={insp.id}
                                        className={`
                                            group transition-colors cursor-pointer border-l-4 border-transparent
                                            ${selectedReports.has(insp.id) ? 'bg-primary/5 border-l-primary' : 'hover:bg-gray-50/50 dark:hover:bg-white/5'}
                                        `}
                                        onClick={() => router.push(`/reports/${insp.id}`)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => { e.stopPropagation(); toggleSelect(insp.id); }}>
                                            <LiquidCheckbox
                                                checked={selectedReports.has(insp.id)}
                                                onCheckedChange={() => toggleSelect(insp.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">{new Date(insp.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium">{insp.client?.name || '-'}</td>
                                        <td className="px-6 py-4 text-gray-500">{insp.inspector?.full_name || 'Unknown'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${insp.compliance_score >= 90 ? 'text-green-600' : 'text-orange-500'}`}>
                                                {insp.compliance_score}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {insp.critical_issues_count > 0 ? (
                                                <span className="text-red-500 font-bold">{insp.critical_issues_count} Issues</span>
                                            ) : (
                                                <span className="text-gray-400">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={insp.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-primary transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDownload(insp)
                                                }}
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading data...</div>
                    ) : filteredInspections.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No reports found matching your criteria.</div>
                    ) : (
                        <div className="flex flex-col">
                            {filteredInspections.map((insp) => (
                                <div
                                    key={insp.id}
                                    className={`
                                        p-4 border-b border-gray-100 dark:border-white/10 transition-colors cursor-pointer active:bg-gray-50
                                        ${selectedReports.has(insp.id) ? 'bg-primary/5' : ''}
                                    `}
                                    onClick={() => router.push(`/reports/${insp.id}`)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1" onClick={(e) => { e.stopPropagation(); toggleSelect(insp.id); }}>
                                                <LiquidCheckbox
                                                    checked={selectedReports.has(insp.id)}
                                                    onCheckedChange={() => toggleSelect(insp.id)}
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                                                    {insp.client?.name || 'Unknown Client'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(insp.date).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge status={insp.status} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 pl-8">
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Inspector</span>
                                            <span className="font-medium">{insp.inspector?.full_name || 'Unknown'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Compliance</span>
                                            <span className={`font-bold ${insp.compliance_score >= 90 ? 'text-green-600' : 'text-orange-500'}`}>
                                                {insp.compliance_score}%
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-400 block mb-0.5">Critical Issues</span>
                                            {insp.critical_issues_count > 0 ? (
                                                <span className="text-red-500 font-bold">{insp.critical_issues_count} Detected</span>
                                            ) : (
                                                <span className="text-gray-400">None</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pl-8">
                                        <button
                                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDownload(insp)
                                            }}
                                        >
                                            <Download className="h-3 w-3" />
                                            Download Report
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedReports.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0A0A0A] border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-fade-in-up w-[90vw] max-w-md justify-center">
                    <span className="font-semibold text-white">
                        {selectedReports.size} Selected
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={() => handleDownload()}
                        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                        <Download className="h-5 w-5" />
                        Download Selected
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={() => setSelectedReports(new Set())}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    )
}
