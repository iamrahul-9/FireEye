import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface ReportInspection {
    date: string
    client: { name: string } | { name: string }[] | null
    inspector: { full_name: string } | null
    compliance_score: number
    critical_issues_count: number
    status: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findings?: any // Complex inspection data structure
    ai_summary?: string
}

export const generateReportPDF = (inspections: ReportInspection[], title: string, returnBlob = false) => {
    try {
        const doc = new jsPDF()

        // Detailed Report Mode (Single Inspection with Findings)
        if (inspections.length === 1 && inspections[0].findings) {
            const ins = inspections[0]
            const clientName = Array.isArray(ins.client) ? ins.client[0]?.name : ins.client?.name || 'Unknown Client'

            // Title Header
            doc.setFillColor(26, 26, 26) // Dark Background
            doc.rect(0, 0, 210, 40, 'F')
            doc.setFontSize(22)
            doc.setTextColor(255, 255, 255)
            doc.text('Inspection Report', 14, 20)

            doc.setFontSize(10)
            doc.setTextColor(200, 200, 200)
            doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 30)

            // Info Card
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(12)
            doc.text(`Client: ${clientName}`, 14, 50)
            doc.text(`Date: ${format(new Date(ins.date), 'MMMM dd, yyyy')}`, 14, 56)
            doc.text(`Inspector: ${ins.inspector?.full_name || 'Unknown'}`, 14, 62)

            // Score
            doc.setFontSize(16)
            const scoreColor = ins.compliance_score >= 90 ? [22, 163, 74] : ins.compliance_score < 70 ? [220, 38, 38] : [234, 88, 12]
            doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
            doc.text(`Score: ${ins.compliance_score}%`, 150, 50)
            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            doc.text('Compliance Score', 150, 56)

            let yPos = 85

            // Executive Summary
            const summaryText = ins.findings?.remarks || ins.ai_summary || 'No specific remarks provided.'

            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.text('Executive Summary / Remarks', 14, 80)

            doc.setFontSize(10)
            doc.setTextColor(60, 60, 60)
            const splitText = doc.splitTextToSize(summaryText, 180)
            doc.text(splitText, 14, 88)

            yPos = 95 + (splitText.length * 5) // Dynamic spacing

            // Helper for Color Coding
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const applyStatusColor = (data: any, cellIndex: number) => {
                if (data.section === 'body' && data.column.index === cellIndex) {
                    const text = (data.cell.raw as string || '').toLowerCase()
                    if (text.includes('ok') || text.includes('satisfactory') || text.includes('working') || text.includes('available') || text.includes('clear') || text.includes('good') || text === 'open') {
                        data.cell.styles.fillColor = [220, 252, 231] // Green-100
                        data.cell.styles.textColor = [21, 128, 61] // Green-700
                        data.cell.styles.fontStyle = 'bold'
                    } else if (text.includes('attention') || text.includes('low') || text.includes('expired')) {
                        data.cell.styles.fillColor = [255, 237, 213] // Orange-100
                        data.cell.styles.textColor = [194, 65, 12] // Orange-700
                        data.cell.styles.fontStyle = 'bold'
                    } else if (text.includes('not') || text.includes('miss') || text.includes('fail')) {
                        if (text.includes('does not exist')) {
                            data.cell.styles.fillColor = [243, 244, 246] // Gray-100
                            data.cell.styles.textColor = [107, 114, 128] // Gray-500
                        } else {
                            data.cell.styles.fillColor = [254, 226, 226] // Red-100
                            data.cell.styles.textColor = [185, 28, 28] // Red-700
                            data.cell.styles.fontStyle = 'bold'
                        }
                    } else if (text === 'n/a' || text === '-') {
                        data.cell.styles.textColor = [156, 163, 175] // Gray-400
                    }
                }
            }

            // 1. Floor Matrix
            if (ins.findings.floors && ins.findings.floors.length > 0) {
                doc.setFontSize(14)
                doc.setTextColor(0, 0, 0)
                doc.text('1. Floor Inspection Matrix', 14, yPos)
                yPos += 5

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const floorRows = ins.findings.floors.map((f: any) => [
                    f.name,
                    f.extinguisher?.status || '-',
                    f.hydrant?.valve || 'N/A',
                    f.hydrant?.hose || 'N/A',
                    f.sprinkler?.status || 'N/A',
                    f.alarm?.status || 'N/A',
                    f.refuge_area?.status || 'N/A',
                    (f.extinguisher?.photo_url || f.hydrant?.valve_photo_url || f.hydrant?.hose_photo_url || f.sprinkler?.photo_url || f.alarm?.photo_url || f.refuge_area?.photo_url) ? 'View Evidence' : '-'
                ])

                autoTable(doc, {
                    startY: yPos,
                    head: [['Floor', 'Extinguisher', 'Hydrant', 'Hose Reel', 'Sprinkler', 'Alarm', 'Refuge Area', 'Photo']],
                    body: floorRows,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 40, 40], fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    didParseCell: function (data) {
                        // Apply color to status columns (1-6)
                        if (data.column.index >= 1 && data.column.index <= 6) {
                            applyStatusColor(data, data.column.index)
                        }
                        // Style Photo text
                        if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 'View Evidence') {
                            data.cell.styles.textColor = [37, 99, 235] // Blue
                        }
                    },
                    didDrawCell: function (data) {
                        // Add Link Annotation Overlay
                        if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 'View Evidence') {
                            const f = ins.findings.floors[data.row.index]
                            const url = f.extinguisher?.photo_url || f.hydrant?.valve_photo_url || f.hydrant?.hose_photo_url || f.sprinkler?.photo_url || f.alarm?.photo_url || f.refuge_area?.photo_url
                            if (url) {
                                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
                            }
                        }
                    }
                })

                // @ts-expect-error jspdf-autotable adds lastAutoTable to doc
                yPos = doc.lastAutoTable.finalY + 15
            }

            // 2. Pumps Matrix
            if (ins.findings.pumps && ins.findings.pumps.length > 0) {
                if (yPos > 250) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('2. Pumps Matrix', 14, yPos); yPos += 5;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pumpRows = ins.findings.pumps.map((p: any) => [
                    p.name, p.status, p.remarks || '-', p.photo_url ? 'View Photo' : '-'
                ])

                autoTable(doc, {
                    startY: yPos,
                    head: [['Pump Type', 'Status', 'Remarks', 'Evidence']],
                    body: pumpRows,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 40, 40] },
                    didParseCell: function (data) {
                        applyStatusColor(data, 1)
                        if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'View Photo') {
                            data.cell.styles.textColor = [37, 99, 235]
                        }
                    },
                    didDrawCell: function (data) {
                        if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'View Photo') {
                            const p = ins.findings.pumps[data.row.index]
                            if (p.photo_url) {
                                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: p.photo_url })
                            }
                        }
                    }
                })
                // @ts-expect-error jspdf-autotable adds lastAutoTable to doc
                yPos = doc.lastAutoTable.finalY + 15
            }

            // 3. Rooms Matrix
            if (ins.findings.rooms && ins.findings.rooms.length > 0) {
                if (yPos > 250) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('3. Rooms Matrix', 14, yPos); yPos += 5;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const roomRows = ins.findings.rooms.map((r: any) => [
                    r.name, r.extinguisher?.status || '-',
                    'N/A', 'N/A', r.remarks || '-',
                    r.extinguisher?.photo_url ? 'View Photo' : '-'
                ])

                autoTable(doc, {
                    startY: yPos,
                    head: [['Room', 'Extinguisher', 'Electrical Panel', 'Server', 'Remarks', 'Evidence']],
                    body: roomRows,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 40, 40] },
                    didParseCell: function (data) {
                        applyStatusColor(data, 1)
                        if (data.section === 'body' && data.column.index === 5 && data.cell.raw === 'View Photo') {
                            data.cell.styles.textColor = [37, 99, 235]
                        }
                    },
                    didDrawCell: function (data) {
                        if (data.section === 'body' && data.column.index === 5 && data.cell.raw === 'View Photo') {
                            const r = ins.findings.rooms[data.row.index]
                            if (r.extinguisher?.photo_url) {
                                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: r.extinguisher.photo_url })
                            }
                        }
                    }
                })
                // @ts-expect-error jspdf-autotable adds lastAutoTable to doc
                yPos = doc.lastAutoTable.finalY + 15
            }

            // 4. Systems Summary
            if (ins.findings.systems && ins.findings.systems.length > 0) {
                if (yPos > 250) { doc.addPage(); yPos = 20; }
                doc.setFontSize(14); doc.setTextColor(0, 0, 0); doc.text('4. System Summary', 14, yPos); yPos += 5;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const systemRows = ins.findings.systems.map((s: any) => [
                    s.name, s.status, s.notes || '-', s.photo_url ? 'View Photo' : '-'
                ])

                autoTable(doc, {
                    startY: yPos,
                    head: [['System', 'Overall Status', 'Notes', 'Evidence']],
                    body: systemRows,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 40, 40] },
                    didParseCell: function (data) {
                        applyStatusColor(data, 1)
                        if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'View Photo') {
                            data.cell.styles.textColor = [37, 99, 235]
                        }
                    },
                    didDrawCell: function (data) {
                        if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'View Photo') {
                            const s = ins.findings.systems[data.row.index]
                            if (s.photo_url) {
                                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: s.photo_url })
                            }
                        }
                    }
                })
            }

            if (returnBlob) {
                return doc.output('blob')
            }

            // Save
            const filename = `${clientName.replace(/\s+/g, '_')}_Inspection_${format(new Date(ins.date), 'yyyy-MM-dd')}.pdf`
            doc.save(filename)
            return
        }

        // Summary Report Mode (List of Inspections)
        // Title
        doc.setFontSize(20)
        doc.text(title, 14, 22)

        // Metadata
        doc.setFontSize(10)
        doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 30)
        doc.text(`Total Inspections: ${inspections.length}`, 14, 36)

        // Table Data
        const tableData = inspections.map(ins => {
            const clientName = Array.isArray(ins.client)
                ? ins.client[0]?.name
                : ins.client?.name || 'Unknown Client'

            return [
                format(new Date(ins.date), 'dd MMM yyyy'),
                clientName,
                ins.inspector?.full_name || 'Unknown',
                `${ins.compliance_score}%`,
                ins.critical_issues_count.toString(),
                ins.status
            ]
        })

        // Generate Table
        autoTable(doc, {
            head: [['Date', 'Client', 'Inspector', 'Score', 'Critical Issues', 'Status']],
            body: tableData,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0] }, // Black header
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 9 },
            didParseCell: function (data) {
                // Highlight Score
                if (data.section === 'body' && data.column.index === 3) {
                    const score = parseInt(data.cell.raw as string)
                    if (score < 70) {
                        data.cell.styles.textColor = [220, 38, 38] // Red
                        data.cell.styles.fontStyle = 'bold'
                    } else if (score >= 90) {
                        data.cell.styles.textColor = [22, 163, 74] // Green
                    }
                }
                // Highlight Critical Issues
                if (data.section === 'body' && data.column.index === 4) {
                    const critical = parseInt(data.cell.raw as string)
                    if (critical > 0) {
                        data.cell.styles.textColor = [220, 38, 38] // Red
                        data.cell.styles.fontStyle = 'bold'
                    }
                }
            }
        })

        // Save
        const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
        doc.save(filename)

    } catch (error) {
        console.error('PDF Generation Error:', error)
        alert('Failed to generate PDF report. Please check console for details.')
    }
}
