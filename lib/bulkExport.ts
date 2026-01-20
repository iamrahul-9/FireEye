import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateReportPDF } from './pdfGenerator'
import { generateInspectionExcel } from './excelGenerator'
import * as XLSX from 'xlsx'

// Helper to get simple CSV string from flat object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const objectToCSV = (obj: any) => {
    const headers = Object.keys(obj)
    const values = Object.values(obj).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v)
    return [headers.join(','), values.join(',')].join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const downloadBulkInspections = async (inspections: any[], format: 'pdf' | 'excel' | 'csv') => {
    const zip = new JSZip()
    const dateStr = new Date().toISOString().split('T')[0]
    const folderName = `inspections_dump_${dateStr}`
    const folder = zip.folder(folderName)

    if (!folder) return

    for (const ins of inspections) {
        const name = `${ins.client?.name || ins.client_name || 'Unknown'}_${ins.date || 'NoDate'}`.replace(/[^a-z0-9]/gi, '_')

        if (format === 'pdf') {
            // Generate PDF Blob
            // We need generateReportPDF to support returning blob/arraybuffer instead of auto-saving
            // I'll update pdfGenerator usage to handle "returnBlob"
            const pdfBlob = generateReportPDF([ins], 'Report', true)
            if (pdfBlob) folder.file(`${name}.pdf`, pdfBlob)
        }

        if (format === 'excel') {
            const wb = generateInspectionExcel(ins)
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
            folder.file(`${name}.xlsx`, excelBuffer)
        }

        if (format === 'csv') {
            // CSV is tricky for nested data. We'll dump the "Overview" as flat key-value pairs
            const flatData = {
                Client: ins.client?.name || '-',
                Date: ins.date,
                Inspector: ins.inspector?.full_name,
                Score: ins.compliance_score,
                Status: ins.status,
                Summary: ins.findings?.remarks || '-'
            }
            folder.file(`${name}.csv`, objectToCSV(flatData))
        }
    }

    const content = await zip.generateAsync({ type: 'blob' })

    // Download the zip with proper filename
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.href = url
    link.download = `${folderName}.zip`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, 100)
}
