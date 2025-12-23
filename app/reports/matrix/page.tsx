'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, Calendar, Building, Shield, CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import PageHeader from '@/components/PageHeader'
import { format } from 'date-fns'

type MatrixCell = 'OK' | 'Critical' | 'Warning' | 'N/A' | 'Does Not Exist'

type MatrixRow = {
    floor: string
    refuge: MatrixCell
    extinguisher: MatrixCell
    hydrant: MatrixCell
    sprinkler: MatrixCell
    alarm: MatrixCell
}

export default function MatrixReportPage() {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])
    const [selectedClientId, setSelectedClientId] = useState('')
    const [matrixData, setMatrixData] = useState<MatrixRow[]>([])
    const [inspectionDate, setInspectionDate] = useState<string | null>(null)
    const [inspectorName, setInspectorName] = useState('')

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name, address, type')
        if (data) setClients(data)
    }

    const generateReport = async () => {
        if (!selectedClientId) return
        setLoading(true)

        // Fetch latest completed inspection for this client
        const { data, error } = await supabase
            .from('inspections')
            .select('*, inspector:users(name)')
            .eq('client_id', selectedClientId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error || !data) {
            setMatrixData([])
            setInspectionDate(null)
            setLoading(false)
            return
        }

        setInspectionDate(data.created_at)
        setInspectorName(data.inspector?.name || 'Unknown')

        const findings = data.findings as any
        const rows: MatrixRow[] = []

        if (findings && findings.floors) {
            findings.floors.forEach((f: any) => {
                rows.push({
                    floor: f.name,
                    refuge: f.refuge_area
                        ? (f.refuge_area.status === 'Open' ? 'OK' : 'Critical')
                        : 'N/A',
                    extinguisher: f.extinguisher.status === 'OK' ? 'OK' : 'Critical',
                    hydrant: f.hydrant
                        ? (f.hydrant.valve === 'OK' && f.hydrant.hose === 'OK' ? 'OK' : 'Critical')
                        : 'N/A',
                    sprinkler: f.sprinkler
                        ? (f.sprinkler.status === 'OK' ? 'OK' : 'Critical')
                        : 'N/A',
                    alarm: f.alarm
                        ? (f.alarm.status === 'OK' ? 'OK' : 'Critical')
                        : 'N/A'
                })
            })
        }

        setMatrixData(rows)
        setLoading(false)
    }

    const getStatusIcon = (status: MatrixCell) => {
        switch (status) {
            case 'OK': return <CheckCircle className="h-5 w-5 text-green-500 mx-auto" strokeWidth={2.5} />
            case 'Critical': return <XCircle className="h-5 w-5 text-red-500 mx-auto" strokeWidth={2.5} />
            case 'Warning': return <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto" />
            case 'Does Not Exist': return <div className="text-xs font-bold text-gray-400">DNE</div>
            default: return <Minus className="h-4 w-4 text-gray-200 mx-auto" />
        }
    }

    const selectedClientDetails = clients.find(c => c.id === selectedClientId)

    return (
        <div className="space-y-6 animate-fade-in p-8">
            <div className="print:hidden">
                <PageHeader
                    title="Safety Matrix Report"
                    subtitle="Grid view of building safety status per floor"
                    actionLabel="Print Report"
                    onActionClick={() => window.print()}
                    actionIcon={Printer}
                />
            </div>

            {/* Filter */}
            <div className="liquid-card p-6 print:hidden">
                <div className="flex items-end gap-4 max-w-xl">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Select Client</label>
                        <select
                            className="liquid-input w-full"
                            value={selectedClientId}
                            onChange={e => setSelectedClientId(e.target.value)}
                        >
                            <option value="">-- Choose Client --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={generateReport}
                        disabled={!selectedClientId || loading}
                        className="liquid-button"
                    >
                        {loading ? <FireEyeLoader size="xs" /> : 'View Matrix'}
                    </button>
                </div>
            </div>

            {/* Report View */}
            {matrixData.length > 0 && selectedClientDetails && (
                <div className="overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="bg-white text-black p-6 md:p-10 shadow-2xl min-h-[29.7cm] min-w-[800px] mx-auto md:max-w-[21cm] print:shadow-none print:w-full print:max-w-none print:p-0 print:min-w-0">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-black pb-6 mb-8 gap-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Safety Matrix</h1>
                                <div className="flex items-center gap-2 text-gray-600 font-medium">
                                    <Building className="h-5 w-5" />
                                    {selectedClientDetails.name}
                                </div>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm">{selectedClientDetails.address}</p>
                            </div>
                            <div className="text-left md:text-right w-full md:w-auto">
                                <div className="bg-black text-white px-4 py-2 font-bold text-lg mb-2 inline-block">
                                    {inspectionDate ? format(new Date(inspectionDate), 'MMMM d, yyyy') : '-'}
                                </div>
                                <p className="text-sm text-gray-500 font-bold">Inspector: {inspectorName}</p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 md:gap-6 mb-6 text-sm justify-start md:justify-end">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="font-bold">Operational</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="font-bold text-red-600">Critical Failure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Minus className="h-4 w-4 text-gray-300" />
                                <span className="text-gray-400">Not Applicable</span>
                            </div>
                        </div>

                        {/* Matrix */}
                        <div className="overflow-hidden">
                            <table className="w-full text-sm border-collapse border border-black table-fixed">
                                <thead>
                                    <tr className="bg-black text-white">
                                        <th className="p-3 text-left border border-black w-24">Floor</th>
                                        <th className="p-3 text-center border border-black w-20">Refuge</th>
                                        <th className="p-3 text-center border border-black">Extinguisher</th>
                                        <th className="p-3 text-center border border-black">Hydrant</th>
                                        <th className="p-3 text-center border border-black">Sprinkler</th>
                                        <th className="p-3 text-center border border-black">Alarm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.map((row, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                            <td className="p-3 font-bold border border-black">{row.floor}</td>
                                            <td className={`p-2 text-center border border-black ${row.refuge === 'Critical' ? 'bg-red-100' : ''}`}>
                                                {getStatusIcon(row.refuge)}
                                            </td>
                                            <td className={`p-2 text-center border border-black ${row.extinguisher === 'Critical' ? 'bg-red-100' : ''}`}>
                                                {getStatusIcon(row.extinguisher)}
                                            </td>
                                            <td className={`p-2 text-center border border-black ${row.hydrant === 'Critical' ? 'bg-red-100' : ''}`}>
                                                {getStatusIcon(row.hydrant)}
                                            </td>
                                            <td className={`p-2 text-center border border-black ${row.sprinkler === 'Critical' ? 'bg-red-100' : ''}`}>
                                                {getStatusIcon(row.sprinkler)}
                                            </td>
                                            <td className={`p-2 text-center border border-black ${row.alarm === 'Critical' ? 'bg-red-100' : ''}`}>
                                                {getStatusIcon(row.alarm)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-2">
                            <div>Generated via FireEye Safety Systems</div>
                            <div>Page 1 of 1</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
