'use client'

import { useState, useEffect } from 'react'
import { LiquidButton, LiquidCheckbox } from '@/components/Liquid'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Calendar as CalendarIcon, ClipboardCheck, UserPlus, Trash2, Check, Download, FileText, BarChart3, Building, Search, Filter, CheckCircle, LayoutList, FileDown } from 'lucide-react'
import { downloadCSV, downloadExcel } from '@/lib/export'
import { downloadBulkInspections } from '@/lib/bulkExport'
import { generateReportPDF } from '@/lib/pdfGenerator'
import { generateInspectionExcel } from '@/lib/excelGenerator'
import * as XLSX from 'xlsx'
import ExportMenu from '@/components/ExportMenu'
import PageHeader from '@/components/PageHeader'
import SearchableSelect from '@/components/SearchableSelect'
import LiquidCalendar from '@/components/LiquidCalendar'
import InspectionCalendar from '@/components/InspectionCalendar'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import ConfirmationModal from '@/components/ConfirmationModal'
import FireEyeLoader from '@/components/FireEyeLoader'
import { useToast } from '@/contexts/ToastContext'
import { subDays, startOfDay, endOfDay } from 'date-fns'

type Inspection = {
    id: string
    date: string
    status: string
    compliance_score: number
    critical_issues_count: number
    client: {
        name: string
        address: string
        type: string
    }
    inspector: {
        full_name: string
        email?: string
    }
    findings?: any // For full export
}

type Client = {
    id: string
    name: string
}

export default function InspectionsPage() {
    // Core Data
    const [inspections, setInspections] = useState<Inspection[]>([])
    const [loading, setLoading] = useState(true)
    const [clients, setClients] = useState<Client[]>([])

    // User & Role State
    const [isAdmin, setIsAdmin] = useState(false)
    const [userEmail, setUserEmail] = useState('')

    // Filters & Search
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('All')
    const [selectedClientId, setSelectedClientId] = useState<string>('all')
    const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'custom'>('all')
    const [customDateRange, setCustomDateRange] = useState<{ from: Date | null, to: Date | null }>({ from: new Date(), to: null })
    const [showCalendar, setShowCalendar] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

    // Selection & Actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const { showToast } = useToast()

    // Aggregate Stats
    const [stats, setStats] = useState({
        total: 0,
        avgScore: 0,
        criticalIssues: 0
    })

    useEffect(() => {
        checkUser()
        fetchClients()
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClientId, dateRange, customDateRange])

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setUserEmail(user.email || '')
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setIsAdmin(profile?.role === 'admin')
        }
    }

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name')
        if (data) setClients(data)
    }

    const fetchData = async () => {
        setLoading(true)
        let query = supabase
            .from('inspections')
            .select(`
                id,
                date,
                status,
                compliance_score,
                critical_issues_count,
                client:clients(name, address, type),
                inspector:profiles(full_name, email)
            `)
            .order('date', { ascending: false })

        // Apply Server-Side Filters
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
            console.error('Error fetching data:', error)
            showToast('Failed to load inspections', 'error')
        } else {
            // @ts-expect-error Supabase join types
            const result = data as Inspection[]
            setInspections(result)

            // Calc Stats
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

    // Client-Side Filtering (Search Text)
    const filteredInspections = inspections.filter(inspection => {
        const matchesSearch =
            (inspection.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (inspection.client?.address || '').toLowerCase().includes(search.toLowerCase()) ||
            (inspection.inspector?.full_name || '').toLowerCase().includes(search.toLowerCase())

        const matchesStatus = filterStatus === 'All' || inspection.status === filterStatus
        return matchesSearch && matchesStatus
    })

    // 1. Top Level Download Action (Selection Based)
    const handleTopDownload = async (type: 'csv' | 'excel' | 'pdf') => {
        if (selectedIds.size === 0) {
            showToast('Please select inspections to download', 'info')
            return
        }

        // Just delegate to the bulk export handler which handles Selected IDs
        handleBulkExport(type)
    }

    // Helper: Fetch Full Data for Detailed Export
    const fetchFullInspection = async (id: string) => {
        const { data, error } = await supabase
            .from('inspections')
            .select(`*, client:clients(*), inspector:profiles(*)`)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    }

    // 2. Single Inspection Export (Detailed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSingleExport = async (inspection: any, type: 'csv' | 'excel' | 'pdf') => {
        showToast('Generating report...', 'info')
        try {
            // Re-fetch full data to ensure we have 'findings'
            const fullData = await fetchFullInspection(inspection.id)

            if (type === 'pdf') {
                generateReportPDF([fullData], 'Report')
            } else if (type === 'excel') {
                const wb = generateInspectionExcel(fullData)
                XLSX.writeFile(wb, `${fullData.client?.name || 'Inspection'}_Report.xlsx`)
            } else if (type === 'csv') {
                // For detailed csv call, we unfortunately can't do matrices well. 
                // We'll fallback to a summarized row
                const dataToExport = [{
                    Date: fullData.date,
                    Client: fullData.client?.name,
                    Score: fullData.compliance_score,
                    Status: fullData.status,
                    Summary: fullData.findings?.remarks
                }]
                downloadCSV(dataToExport, `Inspection_${fullData.id}`)
            }
            showToast('Report downloaded', 'success')
        } catch (e) {
            console.error(e)
            showToast('Failed to export', 'error')
        }
    }

    // 3. Bulk Export (Zip of Detailed Reports)
    const handleBulkExport = async (type: 'csv' | 'excel' | 'pdf') => {
        const selectedIdArray = Array.from(selectedIds)
        if (selectedIdArray.length === 0) return

        showToast('Preparing bulk export...', 'info')
        try {
            // Fetch All Selected Details
            const { data: fullData, error } = await supabase
                .from('inspections')
                .select(`*, client:clients(*), inspector:profiles(*)`)
                .in('id', selectedIdArray)

            if (error || !fullData) throw new Error('Failed to fetch details')

            await downloadBulkInspections(fullData, type)
            showToast('Bulk export ready', 'success')
            setSelectedIds(new Set()) // Clear selection
        } catch (e) {
            console.error(e)
            showToast('Bulk export failed', 'error')
        }
    }

    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInspections.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredInspections.map(i => i.id)))
        }
    }

    const deleteSelected = () => {
        setShowDeleteModal(true)
    }

    const executeDelete = async () => {
        setLoading(true)
        const { error } = await supabase
            .from('inspections')
            .delete()
            .in('id', Array.from(selectedIds))

        if (error) {
            console.error('Error deleting:', error)
            showToast('Failed to delete inspections', 'error')
        } else {
            showToast('Inspections deleted successfully', 'success')
            setSelectedIds(new Set())
            fetchData()
        }
        setLoading(false)
        setShowDeleteModal(false)
    }

    if (loading && inspections.length === 0) {
        return <FireEyeLoader fullscreen text="Loading Inspections..." />
    }

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <PageHeader
                title="Inspections & Reports"
                subtitle="Manage audits, analyze trends, and export reports"
                actionLabel="New Inspection"
                actionUrl="/inspections/new"
                actionIcon={Plus}
            >
                {isAdmin && (
                    <LiquidButton
                        href="/clients/new"
                        icon={UserPlus}
                        variant="ghost"
                    >
                        Add Client
                    </LiquidButton>
                )}
            </PageHeader>

            {/* 1. Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="liquid-card p-4 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold text-[10px] tracking-wider">Total Inspections</p>
                        <p className="text-2xl font-black">{stats.total}</p>
                    </div>
                </div>
                <div className="liquid-card p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <BarChart3 className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold text-[10px] tracking-wider">Avg Compliance</p>
                        <p className={`text-2xl font-black ${stats.avgScore >= 90 ? 'text-green-500' : 'text-orange-500'}`}>
                            {stats.avgScore}%
                        </p>
                    </div>
                </div>
                <div className="liquid-card p-4 flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl">
                        <Building className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold text-[10px] tracking-wider">Critical Issues</p>
                        <p className="text-2xl font-black">{stats.criticalIssues}</p>
                    </div>
                </div>
            </div>

            {/* 2. Advanced Filters */}
            <div className="liquid-card p-4 !overflow-visible relative z-40">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="relative w-full lg:flex-[1.5]">
                        <input
                            type="text"
                            className="liquid-input w-full !pl-10"
                            placeholder="Search client, address, or inspector..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row flex-[2] w-full gap-4">
                        {/* Time Range */}
                        <div className="relative flex-1 group">
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="liquid-input w-full flex items-center justify-between text-left"
                            >
                                <span className="truncate text-sm">
                                    {dateRange === 'all' ? 'All Time' :
                                        dateRange === '30d' ? 'Last 30 Days' :
                                            dateRange === '90d' ? 'Last 90 Days' :
                                                customDateRange.from ? `${customDateRange.from.toLocaleDateString()}...` : 'Custom Range'}
                                </span>
                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                            </button>

                            {showCalendar && (
                                <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl p-2 animate-fade-in-up">
                                    <div className="grid grid-cols-3 gap-1 mb-2">
                                        {['all', '30d', '90d'].map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => { setDateRange(r as any); setShowCalendar(false); }}
                                                className={`text-xs py-1 rounded-md ${dateRange === r ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-gray-400'}`}
                                            >
                                                {r === 'all' ? 'All' : r}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="border-t border-white/10 pt-2">
                                        <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase">Custom Range</p>
                                        <LiquidCalendar
                                            selectedRange={customDateRange}
                                            onChange={(r) => { setCustomDateRange(r); setDateRange('custom'); }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="relative flex-1">
                            <select
                                className="liquid-input w-full !pl-9 !pr-8 py-2.5 text-sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                <option value="Completed">Completed</option>
                                <option value="Action Required">Action Required</option>
                                <option value="Draft">Draft</option>
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Client */}
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

            {/* 3. View Toggle & Data List */}
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {viewMode === 'list' ? 'All Inspections' : 'Calendar Timeline'}
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg border border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <LayoutList size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <CalendarIcon size={18} />
                        </button>
                    </div>

                    <div className={`${selectedIds.size === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <ExportMenu
                            label="Bulk Download"
                            onExportCSV={() => handleTopDownload('csv')}
                            onExportExcel={() => handleTopDownload('excel')}
                            onExportPDF={() => handleTopDownload('pdf')}
                        />
                    </div>

                    <LiquidButton
                        href="/inspections/new"
                        icon={Plus}
                    >
                        New Inspection
                    </LiquidButton>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="liquid-card p-6">
                    <InspectionCalendar inspections={filteredInspections as any[]} />
                </div>
            ) : (
                <div className="liquid-card">
                    {inspections.length === 0 && !loading ? (
                        <EmptyState
                            icon={ClipboardCheck}
                            title="No inspections found"
                            description="Start a new inspection to track data."
                            actionLabel="Start Inspection"
                            actionUrl="/inspections/new"
                        />
                    ) : (
                        <>
                            <div className="px-6 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <LiquidCheckbox
                                        checked={selectedIds.size === filteredInspections.length && filteredInspections.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Select All</span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    Showing {filteredInspections.length} results
                                </span>
                            </div>
                            <ul className="divide-y divide-gray-100 dark:divide-white/10">
                                {filteredInspections.map((inspection) => (
                                    <li
                                        key={inspection.id}
                                        className={`
                                        hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer relative hover:z-50
                                        ${selectedIds.has(inspection.id) ? 'bg-primary/5' : ''}
                                    `}
                                    >
                                        <div className="px-4 py-4 sm:px-6 relative">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1" onClick={(e) => toggleSelection(inspection.id, e)}>
                                                    <LiquidCheckbox
                                                        checked={selectedIds.has(inspection.id)}
                                                        onCheckedChange={() => toggleSelection(inspection.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                                    {/* Clickable Main Content area */}
                                                    <Link href={`/inspections/${inspection.id}`} className="flex-1 min-w-0 group block">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            {/* Main Info */}
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                                        {inspection.client?.name || 'Unknown Client'}
                                                                    </p>
                                                                    <StatusBadge status={inspection.status} />
                                                                </div>
                                                                <p className="text-xs text-gray-500 truncate">{inspection.client?.address}</p>
                                                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                                    <span className="flex items-center">
                                                                        <CalendarIcon className="mr-1 h-3 w-3" />
                                                                        {new Date(inspection.date).toLocaleDateString()}
                                                                    </span>
                                                                    <span>•</span>
                                                                    <span>{inspection.inspector?.full_name || 'Unassigned'}</span>
                                                                    {inspection.critical_issues_count > 0 && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="text-red-500 font-bold">{inspection.critical_issues_count} Issues</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Stats (Visual only here, part of the link) */}
                                                            <div className="text-right hidden sm:block shrink-0">
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Score</p>
                                                                <p className={`text-lg font-bold ${inspection.compliance_score >= 90 ? 'text-green-500' : 'text-orange-500'}`}>
                                                                    {inspection.compliance_score}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Link>

                                                    {/* Actions - COMPLETELY SEPARATE from Link */}
                                                    <div className="flex items-center gap-2 shrink-0 relative z-20">
                                                        <ExportMenu
                                                            onExportCSV={() => handleSingleExport(inspection, 'csv')}
                                                            onExportExcel={() => handleSingleExport(inspection, 'excel')}
                                                            onExportPDF={() => handleSingleExport(inspection, 'pdf')}
                                                        />

                                                        {/* Duplicate FileText button if needed, visually separate */}
                                                        <Link href={`/inspections/${inspection.id}`} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">
                                                            <FileText className="h-4 w-4" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}

            {/* Bulk Actions Floating Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0A0A0A] border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-fade-in-up w-[90vw] max-w-md justify-center">
                    <span className="font-semibold text-white">
                        {selectedIds.size} Selected
                    </span>


                    {isAdmin && (
                        <>
                            <div className="h-4 w-px bg-white/10" />
                            <button
                                onClick={deleteSelected}
                                className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors font-medium"
                            >
                                <Trash2 className="h-5 w-5" />
                                Delete
                            </button>
                        </>
                    )}

                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <ConfirmationModal
                isOpen={showDeleteModal}
                title="Delete Inspections"
                message={`Are you sure you want to delete ${selectedIds.size} selected items?`}
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteModal(false)}
                isLoading={loading}
            />
        </div>
    )
}
