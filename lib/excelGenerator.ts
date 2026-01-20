import * as XLSX from 'xlsx'
import { format } from 'date-fns'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateInspectionExcel = (inspection: any) => {
    const wb = XLSX.utils.book_new()

    // Single Sheet Data Collection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allData: any[][] = []

    // 1. Overview Section
    allData.push(['INSPECTION REPORT'])
    allData.push(['Generated', format(new Date(), 'PPpp')])
    allData.push([]) // Spacer
    allData.push(['Client', inspection.client?.name || inspection.client_name || 'Unknown'])
    allData.push(['Date', format(new Date(inspection.date || inspection.scheduled_date), 'yyyy-MM-dd')])
    allData.push(['Inspector', inspection.inspector?.full_name || 'Unknown'])
    allData.push(['Status', inspection.status])
    allData.push(['Compliance Score', `${inspection.compliance_score || 0}%`])
    allData.push(['Critical Issues', inspection.critical_issues_count || 0])
    allData.push([])
    allData.push(['EXECUTIVE SUMMARY'])
    allData.push([inspection.findings?.remarks || inspection.ai_summary || 'No remarks.'])
    allData.push([])

    // 2. Floors Section
    if (inspection.findings?.floors?.length > 0) {
        allData.push(['FLOOR FINDINGS'])
        allData.push(['Floor', 'Extinguisher', 'Hydrant', 'Hose Reel', 'Sprinkler', 'Alarm', 'Refuge Area', 'Evidence'])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inspection.findings.floors.forEach((f: any) => {
            allData.push([
                f.name,
                f.extinguisher?.status || '-',
                f.hydrant?.valve || '-',
                f.hydrant?.hose || '-',
                f.sprinkler?.status || '-',
                f.alarm?.status || '-',
                f.refuge_area?.status || '-',
                f.extinguisher?.photo_url || f.hydrant?.valve_photo_url || 'N/A'
            ])
        })
        allData.push([])
    }

    // 3. Pumps Section
    if (inspection.findings?.pumps?.length > 0) {
        allData.push(['PUMP ROOM FINDINGS'])
        allData.push(['Pump', 'Status', 'Remarks', 'Evidence'])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inspection.findings.pumps.forEach((p: any) => {
            allData.push([
                p.name,
                p.status,
                p.remarks || '-',
                p.photo_url || '-'
            ])
        })
        allData.push([])
    }

    // 4. Systems Section
    if (inspection.findings?.systems?.length > 0) {
        allData.push(['SYSTEM CHECKLIST'])
        allData.push(['System', 'Status', 'Notes', 'Evidence'])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inspection.findings.systems.forEach((s: any) => {
            allData.push([
                s.name,
                s.status,
                s.notes || '-',
                s.photo_url || '-'
            ])
        })
        allData.push([])
    }

    const ws = XLSX.utils.aoa_to_sheet(allData)
    XLSX.utils.book_append_sheet(wb, ws, 'Detailed Report')

    return wb
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateClientExcel = (clients: any[]) => {
    const headers = ['ID', 'Name', 'Address', 'Phone', 'Email', 'Type', 'Next Inspection']
    const rows = clients.map(c => [
        c.id, c.name, c.address, c.phone, c.email, c.type,
        c.next_inspection_date ? format(new Date(c.next_inspection_date), 'yyyy-MM-dd') : '-'
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clients')
    return wb
}
