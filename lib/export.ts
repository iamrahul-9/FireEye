import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function downloadCSV(data: any[], filename: string) {
    if (!data || data.length === 0 || !data[0]) {
        console.warn('No data available for CSV export')
        return
    }

    const headers = Object.keys(data[0])
    if (headers.length === 0) {
        console.warn('Data object is empty, cannot generate CSV')
        return
    }

    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => {
                const value = row[fieldName]
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`
                }
                return value ?? ''
            }).join(',')
        )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveFile(blob, `${filename}.csv`)
}

export function downloadExcel(data: any[], filename: string) {
    if (!data || data.length === 0 || !data[0]) {
        console.warn('No data available for Excel export')
        return
    }

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function downloadPDF(data: any[], filename: string, title: string = 'Report') {
    if (!data || data.length === 0) return

    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text(title, 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30)

    // Table
    const headers = Object.keys(data[0])
    const rows = data.map(row => Object.values(row))

    autoTable(doc, {
        head: [headers],
        body: rows as any[],
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] }, // Orange Primary
    })

    doc.save(`${filename}.pdf`)
}

function saveFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    // Cleanup after a short delay to ensure download starts
    setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, 100)
}

