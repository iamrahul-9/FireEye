import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, AlertTriangle, Camera, XCircle } from 'lucide-react'

// Helper Component for Matrix Status
function StatusCell({ status }: { status: string }) {
    if (!status) return <span className="text-gray-300">-</span>

    let colorClass = 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400' // Default / Does Not Exist / N/A

    const lower = status.toLowerCase()

    if (lower.includes('ok') || lower.includes('satisfactory') || lower.includes('working') || lower.includes('available') || lower.includes('clear') || lower.includes('good') || lower === 'open') {
        colorClass = 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
    } else if (lower.includes('attention') || lower.includes('low') || lower.includes('expired')) {
        colorClass = 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
    } else if (lower.includes('not') || lower.includes('miss') || lower.includes('fail')) {
        // "Does Not Exist" should be grey, "Not Available" should be red
        if (lower.includes('does not exist')) {
            colorClass = 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
        } else {
            colorClass = 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
        }
    }

    return (
        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold whitespace-nowrap ${colorClass}`}>
            {status}
        </span>
    )
}

const PhotoModal = ({ url, onClose }: { url: string | null, onClose: () => void }) => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!url || !mounted) return null

    // Use createPortal to break out of any overflow-hidden containers
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                <img
                    src={url}
                    alt="Evidence"
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                />
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md border border-white/20"
                >
                    <XCircle className="h-6 w-6" />
                </button>
            </div>
        </div>,
        document.body
    )
}

function StatusWithPhoto({ status, photo_url, onViewPhoto }: { status: string, photo_url?: string, onViewPhoto: (url: string) => void }) {
    return (
        <div className="flex flex-col gap-1 items-start">
            <StatusCell status={status} />
            {photo_url && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onViewPhoto(photo_url)
                    }}
                    className="text-[10px] text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 font-medium transition-colors"
                >
                    <Camera className="h-3 w-3" /> View Photo
                </button>
            )}
        </div>
    )
}

export default function InspectionMatrix({ findings }: { findings: any }) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    if (!findings) return null

    return (
        <>
            <PhotoModal url={selectedPhoto} onClose={() => setSelectedPhoto(null)} />

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {(() => {
                    let total = 0
                    let failed = 0
                    let critical = 0
                    let actionRequired = 0

                    const checkStatus = (status: string | undefined) => {
                        if (!status || status === 'N/A' || status === '-') return
                        total++
                        const s = status.toLowerCase()
                        if (s.includes('fail') || s.includes('miss') || s.includes('not') || s.includes('attention') || s.includes('action')) {
                            failed++
                            if (s.includes('action')) actionRequired++
                        }
                        if (s.includes('urgent') || s.includes('critical') || s.includes('locked') || s.includes('blocked')) {
                            critical++
                        }
                    }

                    // Count Floors
                    findings.floors?.forEach((f: any) => {
                        checkStatus(f.extinguisher?.status)
                        checkStatus(f.hydrant?.valve)
                        checkStatus(f.hydrant?.hose)
                        checkStatus(f.sprinkler?.status)
                        checkStatus(f.alarm?.status)
                        checkStatus(f.refuge_area?.status)
                    })
                    // Count Pumps
                    findings.pumps?.forEach((p: any) => checkStatus(p.status))
                    // Count Rooms
                    findings.rooms?.forEach((r: any) => {
                        checkStatus(r.extinguisher?.status)
                        checkStatus(r.accessibility)
                        checkStatus(r.housekeeping)
                    })
                    // Count Systems
                    findings.systems?.forEach((s: any) => checkStatus(s.status))

                    return (
                        <>
                            <div className="liquid-card p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black text-gray-900 dark:text-white">{total}</span>
                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Total Items</span>
                            </div>
                            <div className="liquid-card p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black text-emerald-500">{total - failed}</span>
                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">Passed</span>
                            </div>
                            <div className="liquid-card p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <span className="text-2xl font-black text-orange-500 relative z-10">{failed}</span>
                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1 relative z-10">Issues Found</span>
                                {failed > 0 && <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors" />}
                            </div>
                            <div className="liquid-card p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <span className="text-2xl font-black text-red-600 relative z-10">{critical}</span>
                                <span className="text-xs text-red-500/80 uppercase font-bold tracking-wider mt-1 relative z-10">Critical Items</span>
                                {critical > 0 && <AlertTriangle className="absolute -right-4 -top-4 w-16 h-16 text-red-500/10 rotate-12" />}
                                {critical > 0 && <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />}
                            </div>
                        </>
                    )
                })()}
            </div>

            <div className="space-y-8">
                {/* 1. Floor Matrix */}
                {findings.floors?.length > 0 && (
                    <div className="liquid-card overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Floor Inspection Matrix</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Floor</th>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Extinguisher</th>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Hydrant</th>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Hose Reel</th>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Sprinkler</th>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Alarm</th>
                                        <th className="px-4 py-3 font-bold whitespace-nowrap">Refuge Area</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {findings.floors.map((floor: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium">{floor.name}</td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={floor.extinguisher?.status} photo_url={floor.extinguisher?.photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={floor.hydrant?.valve || 'N/A'} photo_url={floor.hydrant?.valve_photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={floor.hydrant?.hose || 'N/A'} photo_url={floor.hydrant?.hose_photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={floor.sprinkler?.status || 'N/A'} photo_url={floor.sprinkler?.photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={floor.alarm?.status || 'N/A'} photo_url={floor.alarm?.photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={floor.refuge_area?.status || 'N/A'} photo_url={floor.refuge_area?.photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. Pumps Matrix */}
                {findings.pumps?.length > 0 && (
                    <div className="liquid-card overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Pumps Matrix</h3>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">Pump Type</th>
                                        <th className="px-4 py-3 font-bold">Status</th>
                                        <th className="px-4 py-3 font-bold">Remarks</th>
                                        <th className="px-4 py-3 font-bold text-right">Photo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {findings.pumps.map((pump: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium">{pump.name}</td>
                                            <td className="px-4 py-3"><StatusCell status={pump.status} /></td>
                                            <td className="px-4 py-3 text-gray-500">{pump.remarks || '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                {pump.photo_url ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedPhoto(pump.photo_url)
                                                        }}
                                                        className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline bg-blue-50 px-2 py-1 rounded-md border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20"
                                                    >
                                                        <Camera className="h-3 w-3" /> View
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-[10px] italic">No Image</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
                            {findings.pumps.map((pump: any, idx: number) => (
                                <div key={idx} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{pump.name}</span>
                                        <StatusCell status={pump.status} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        {pump.remarks && (
                                            <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-md border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400">
                                                {pump.remarks}
                                            </div>
                                        )}
                                        {pump.photo_url && (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedPhoto(pump.photo_url)
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-medium"
                                                >
                                                    <Camera className="h-3 w-3" /> View Evidence
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Rooms Matrix */}
                {findings.rooms?.length > 0 && (
                    <div className="liquid-card overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                            <h3 className="text-sm font-bold uppercase text-gray-500">Rooms Matrix</h3>
                        </div>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">Room</th>
                                        <th className="px-4 py-3 font-bold">Extinguisher</th>
                                        <th className="px-4 py-3 font-bold">Electrical Panel</th>
                                        <th className="px-4 py-3 font-bold">Server</th>
                                        <th className="px-4 py-3 font-bold">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {findings.rooms.map((room: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium">{room.name}</td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={room.extinguisher?.status} photo_url={room.extinguisher?.photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3"><StatusCell status={room.accessibility || 'N/A'} /></td>
                                            <td className="px-4 py-3"><StatusCell status={room.housekeeping || 'N/A'} /></td>
                                            <td className="px-4 py-3 text-gray-500">{room.remarks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
                            {findings.rooms.map((room: any, idx: number) => (
                                <div key={idx} className="p-4 space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{room.name}</span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center bg-gray-50/50 dark:bg-white/5 p-2 rounded">
                                            <span className="text-gray-500">Extinguisher</span>
                                            <StatusWithPhoto status={room.extinguisher?.status} photo_url={room.extinguisher?.photo_url} onViewPhoto={setSelectedPhoto} />
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50/50 dark:bg-white/5 p-2 rounded">
                                            <span className="text-gray-500">Electrical Panel</span>
                                            <StatusCell status={room.accessibility || 'N/A'} />
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50/50 dark:bg-white/5 p-2 rounded">
                                            <span className="text-gray-500">Server</span>
                                            <StatusCell status={room.housekeeping || 'N/A'} />
                                        </div>
                                        {room.remarks && (
                                            <div className="italic text-gray-500 pl-1 border-l-2 border-gray-200 dark:border-gray-700">
                                                {room.remarks}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Systems Summary */}
                {findings.systems?.length > 0 && (
                    <div className="liquid-card overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                            <h3 className="text-sm font-bold uppercase text-gray-500">System Summary</h3>
                        </div>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">System</th>
                                        <th className="px-4 py-3 font-bold">Overall Status</th>
                                        <th className="px-4 py-3 font-bold">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {findings.systems.map((sys: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium">{sys.name}</td>
                                            <td className="px-4 py-3"><StatusWithPhoto status={sys.status} photo_url={sys.photo_url} onViewPhoto={setSelectedPhoto} /></td>
                                            <td className="px-4 py-3 text-gray-500">{sys.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
                            {findings.systems.map((sys: any, idx: number) => (
                                <div key={idx} className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{sys.name}</span>
                                        <StatusWithPhoto status={sys.status} photo_url={sys.photo_url} onViewPhoto={setSelectedPhoto} />
                                    </div>
                                    {sys.notes && (
                                        <p className="text-xs text-gray-500 border-l-2 border-gray-200 dark:border-white/10 pl-2">
                                            {sys.notes}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div >
        </>
    )
}
