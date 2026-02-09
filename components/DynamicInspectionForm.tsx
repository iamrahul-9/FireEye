'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { Save, MapPin, Building, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Shield, Sparkles, Minus, Plus, Loader2, Trash2 } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import { LiquidCard, LiquidButton, LiquidCheckbox } from '@/components/Liquid'
import SearchableSelect from '@/components/SearchableSelect'
import ConfirmationModal from '@/components/ConfirmationModal'
import PhotoUpload from '@/components/PhotoUpload'
import { generateInspectionSummary } from '@/lib/smartSummary'
import { calculateNextInspectionDate } from '@/lib/scheduling'
import { sendAssignmentEmailAction, sendCriticalAlertAction } from '@/app/actions'
import { generateSmartSummary } from '@/app/actions/generateSmartSummary'
import { useCopilot } from '@/contexts/CopilotContext'
import FloorInspectionCard from './FloorInspectionCard'
import { ExtinguisherLocationConfig } from './ClientForms/types'

// --- Types ---

type Client = {
    id: string
    name: string
    address: string
    type: 'Office/Store' | 'Society/Residential'
    wings?: string[]
    structure: {
        basements: number
        podiums: number
        floors: number
        structure_map: string[]
        rooms: string[]
        systems: string[]
        refuge_floors?: string[]
        riser_count?: number
        extinguisher_pattern?: 'Lobby Only' | 'Staircase Only' | 'Both'
        extinguisher_config?: ExtinguisherLocationConfig
        pumps?: { id: string, name: string, type: string, hp: number }[]
        hydrant_points_qty?: number
        hose_reel_drum_qty?: number
        sprinkler_qty?: number
    }
}

// Imported from shared types or redefined to match
import { InspectionData, FloorData, RoomData, SystemData, PumpData, ExtinguisherData, RiserData, ExtinguisherType } from '@/types/inspection'

// --- Constants ---

const WEIGHTS = {
    'Fire Alarm System': 5,
    'Pumps': 5,
    'Sprinkler System': 4,
    'Hydrant System': 3,
    'Fire Extinguisher': 3,
    'Housekeeping': 1
}

const calculateCompliance = (data: InspectionData) => {
    let totalWeight = 0
    let obtainedWeight = 0
    let criticalCount = 0

    // 1. Floors (Extinguishers, Fire Alarm, Risers, Refuge Area)
    data.floors.forEach(f => {
        // Extinguishers (Weight 3 total, distributed among all extinguishers)
        const extWeight = WEIGHTS['Fire Extinguisher'] / (f.extinguishers.length || 1)
        f.extinguishers.forEach(ext => {
            totalWeight += extWeight
            if (ext.status === 'Okay') obtainedWeight += extWeight
            if (ext.status === 'Expired' || ext.status === 'Not Available') criticalCount++
        })

        // Fire Alarm (Weight 5)
        totalWeight += WEIGHTS['Fire Alarm System']
        if (f.fire_alarm.status === 'Okay') obtainedWeight += WEIGHTS['Fire Alarm System']
        if (f.fire_alarm.status === 'Not Okay') criticalCount++

        // Risers - each has sprinkler, hydrant valve, hose reel
        const riserWeight = (WEIGHTS['Hydrant System'] + WEIGHTS['Sprinkler System']) / (f.risers.length || 1)
        f.risers.forEach(riser => {
            // Sprinkler (1/3 of riser weight)
            totalWeight += riserWeight / 3
            if (riser.sprinkler.status === 'Okay') obtainedWeight += riserWeight / 3
            if (riser.sprinkler.status !== 'Okay') criticalCount++

            // Hydrant Valve (1/3 of riser weight)
            totalWeight += riserWeight / 3
            if (riser.hydrant_valve.status === 'Okay') obtainedWeight += riserWeight / 3
            if (riser.hydrant_valve.status !== 'Okay' && riser.hydrant_valve.status !== 'Not Available') criticalCount++

            // Hose Reel (1/3 of riser weight)
            totalWeight += riserWeight / 3
            if (riser.hose_reel.status === 'Okay') obtainedWeight += riserWeight / 3
            if (riser.hose_reel.status !== 'Okay' && riser.hose_reel.status !== 'Not Available') criticalCount++
        })

        // Refuge Area
        if (f.refuge_area) {
            totalWeight += 5
            if (f.refuge_area.status === 'Empty') obtainedWeight += 5
            else criticalCount++
        }
    })

    // 2. Systems
    data.systems.forEach(s => {
        if (s.status !== 'Does Not Exist') {
            const w = WEIGHTS[s.name as keyof typeof WEIGHTS] || 3
            totalWeight += w
            if (s.status === 'Satisfactory') obtainedWeight += w
            if (s.status === 'Not Operational') criticalCount++
        }
    })

    // 3. Pumps
    data.pumps.forEach(p => {
        if (p.status !== 'Does Not Exist') {
            totalWeight += WEIGHTS['Pumps']
            if (p.status.includes('Working')) obtainedWeight += WEIGHTS['Pumps']
            if (p.status === 'Not Working') criticalCount++
        }
    })

    // 4. Rooms (Housekeeping / Extinguisher)
    data.rooms.forEach(r => {
        totalWeight += WEIGHTS['Housekeeping']
        if (r.housekeeping === 'Good') obtainedWeight += WEIGHTS['Housekeeping']

        // Extinguisher in Room check
        totalWeight += WEIGHTS['Fire Extinguisher']
        if (r.extinguisher.status === 'Available') obtainedWeight += WEIGHTS['Fire Extinguisher']
        else criticalCount++ // Missing
    })

    const score = totalWeight > 0 ? Math.round((obtainedWeight / totalWeight) * 100) : 100

    return { score, criticalCount }
}

// --- Component ---

export default function DynamicInspectionForm({ clients, user }: { clients: any[], user: any }) {
    const router = useRouter()
    const { showToast } = useToast()

    // Selection State
    const [selectedClientId, setSelectedClientId] = useState('')
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [selectedWing, setSelectedWing] = useState<string | null>(null)

    // Form State
    const [data, setData] = useState<InspectionData>({
        floors: [],
        rooms: [],
        systems: [],
        pumps: [],
        remarks: ''
    })
    const [loading, setLoading] = useState(false)
    const [isGeneratingOverallSummary, setIsGeneratingOverallSummary] = useState(false)

    const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({})
    const [validationError, setValidationError] = useState<string | null>(null)
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, message: string }>({
        isOpen: false,
        onConfirm: () => { },
        title: '',
        message: ''
    })

    // Copilot Context Sync
    const { setInspectionData } = useCopilot()
    useEffect(() => {
        setInspectionData(data)
        // Cleanup on unmount
        // return () => setInspectionData(null) // Optional: keep last context or clear? Better to clear or keep for history? 
        // Actually, if we navigate away, we might want to keep it? No, if we leave inspection, we are not in inspection context.
        return () => setInspectionData(null)
    }, [data, setInspectionData])

    // Initialize Form when Client Selected
    useEffect(() => {
        if (!selectedClientId) {
            setSelectedClient(null)
            setSelectedWing(null)
            return
        }

        const client = clients.find(c => c.id === selectedClientId) as Client
        if (client) {
            // New Client Selected -> Reset Wing
            if (client.id !== selectedClient?.id) {
                setSelectedWing(null)
                setSelectedClient(client)
            }

            // If Client has wings but none selected, do NOT generate data yet
            if (client.wings && client.wings.length > 0 && !selectedWing) {
                return
            }

            // Generate Initial Data Structure
            const structure = client.structure || {}
            const refugeFloors = structure.refuge_floors || []

            // 1. Floors
            const riserCount = structure.riser_count || 1
            const extPattern = structure.extinguisher_pattern || 'Lobby Only'
            
            // Generate extinguishers based on pattern
            // Generate extinguishers based on pattern or config
            const generateExtinguishers = (): ExtinguisherData[] => {
                const config = structure.extinguisher_config
                
                // 1. Use Config if available (New Way)
                if (config && Object.keys(config).length > 0) {
                    const exts: ExtinguisherData[] = []
                    Object.entries(config).forEach(([location, items]) => {
                        if (items && items.length > 0) {
                            const typeCounts: Record<string, number> = {}
                            // Filter out 0 counts (though admin shouldn't save them, just safely)
                            items.forEach(item => {
                                if (item.count > 0) typeCounts[item.type] = item.count
                            })
                            
                            // Only add if there are actual extinguishers configured
                            if (Object.keys(typeCounts).length > 0) {
                                exts.push({
                                    location: location as 'Lobby' | 'Staircase',
                                    status: 'Okay',
                                    types: typeCounts
                                })
                            }
                        }
                    })
                    
                    // If we successfully generated based on config, return it
                    if (exts.length > 0) return exts
                }

                // 2. Fallback to Pattern (Legacy / Simple Way)
                if (extPattern === 'Both') {
                    return [
                        { location: 'Lobby', status: 'Okay', types: { 'ABC': 1 } },
                        { location: 'Staircase', status: 'Okay', types: { 'ABC': 1 } }
                    ]
                } else if (extPattern === 'Staircase Only') {
                    return [{ location: 'Staircase', status: 'Okay', types: { 'ABC': 1 } }]
                } else {
                    return [{ location: 'Lobby', status: 'Okay', types: { 'ABC': 1 } }]
                }
            }
            
            // Generate risers based on count
            const generateRisers = (): RiserData[] => {
                const hasHydrant = (structure.hydrant_points_qty || 0) > 0
                const hasHoseReel = (structure.hose_reel_drum_qty || 0) > 0
                const hasSprinkler = (structure.sprinkler_qty || 0) > 0

                return Array.from({ length: riserCount }, (_, i) => ({
                    name: riserCount === 1 ? 'Riser Status' : `Riser ${i + 1}`,
                    sprinkler: { status: hasSprinkler ? 'Okay' : 'Not Available' },
                    hydrant_valve: { status: hasHydrant ? 'Okay' : 'Not Available' },
                    hose_reel: { status: hasHoseReel ? 'Okay' : 'Not Available' }
                }))
            }
            
            const floors: FloorData[] = (structure.structure_map || []).map(floor => ({
                name: floor,
                extinguishers: generateExtinguishers(),
                fire_alarm: { status: 'Okay' },
                risers: generateRisers(),
                refuge_area: refugeFloors.includes(floor) ? { status: 'Empty' } : undefined
            }))

            // 2. Rooms
            const rooms: RoomData[] = (structure.rooms || []).map(room => ({
                name: room,
                housekeeping: 'Good',
                accessibility: 'Clear',
                extinguisher: { status: 'Available', types: { 'ABC': 1 } },
                remarks: ''
            }))

            // 3. Systems
            const systems: SystemData[] = (structure.systems || []).map(sys => ({
                name: sys,
                status: 'Satisfactory',
                notes: ''
            }))

            // 4. Pumps (Configured from Client)
            const pumps: PumpData[] = []
            
            if (structure.pumps && structure.pumps.length > 0) {
                // Use configured pumps
                structure.pumps.forEach(p => {
                    pumps.push({
                        name: p.name,
                        status: 'Auto (Working)',
                        pressure: '',
                        remarks: `Type: ${p.type} (${p.hp} HP)`
                    })
                })
            } else {
                // FALLBACK for old clients without configured pumps
                const sys = structure.systems || []
                const hasHydrant = (structure.hydrant_points_qty || 0) > 0 || sys.includes('Hydrant Valve') || sys.includes('Hose Reel Drum')
                const hasSprinkler = (structure.sprinkler_qty || 0) > 0 || sys.includes('Sprinkler System')

                if (hasHydrant) {
                    pumps.push(
                        { name: 'Main Pump - Hydrant', status: 'Auto (Working)', pressure: '', remarks: '' },
                        { name: 'Jockey Pump - Hydrant', status: 'Auto (Working)', pressure: '', remarks: '' }
                    )
                }
                if (hasSprinkler) {
                    pumps.push(
                        { name: 'Main Pump - Sprinkler', status: 'Auto (Working)', pressure: '', remarks: '' },
                        { name: 'Jockey Pump - Sprinkler', status: 'Auto (Working)', pressure: '', remarks: '' }
                    )
                }
                if (hasHydrant || hasSprinkler) {
                    pumps.push(
                        { name: 'Booster Pump', status: 'Auto (Working)', pressure: '', remarks: '' }
                    )
                }
                // NOTE: Diesel Pump is NOT added in fallback to respect "optional" requirement. 
                // It must be explicitly configured in new clients.
            }

            // Note: Risers and extinguishers are now pre-configured during floor initialization
            // based on client's riser_count and extinguisher_pattern settings

            setData({ floors, rooms, systems, pumps, remarks: '' })

            // Auto expand first floor
            if (floors.length > 0) {
                setExpandedFloors({ [floors[0].name]: true })
            }
        }
    }, [selectedClientId, clients, selectedWing])

    const toggleFloor = (floorName: string) => {
        setExpandedFloors(prev => ({ ...prev, [floorName]: !prev[floorName] }))
    }

    const handleSubmit = async () => {
        // --- Validation ---

        // 1. Client Required
        if (!selectedClientId) {
            showToast('Please select a client before submitting.', 'error')
            return
        }

        // 1.5 Wing Required (if applicable)
        if (selectedClient?.wings && selectedClient.wings.length > 0 && !selectedWing) {
            showToast('Please select a Wing.', 'error')
            return
        }

        // 2. Pumps Required
        const unselectedPumps: typeof data.pumps = [] // All pumps now have valid defaults
        if (unselectedPumps.length > 0) {
            setValidationError(`Please select a status for the following pumps:\n\n${unselectedPumps.map(p => p.name).join('\n')}`)
            return
        }

        // 3. Overall Remarks Required
        if (!data.remarks.trim()) {
            setValidationError('Please provide overall remarks for the inspection.')
            return
        }

        // 4. Photo Enforcement (Critical / Failures must have photos)
        const missingPhotos: string[] = []

        // Floors
        data.floors.forEach(f => {
            // Extinguishers
            f.extinguishers.forEach(ext => {
                if (ext.status !== 'Okay' && ext.status !== 'Not Available' && !ext.photo_url) {
                    missingPhotos.push(`${f.name}: Extinguisher ${ext.location} (${ext.status})`)
                }
            })
            
            // Fire Alarm
            if (f.fire_alarm.status !== 'Okay' && !f.fire_alarm.photo_url) {
                missingPhotos.push(`${f.name}: Fire Alarm (${f.fire_alarm.status})`)
            }
            
            // Risers
            f.risers.forEach((riser, i) => {
                const riserName = f.risers.length === 1 ? 'Riser' : `Riser ${i + 1}`
                if (riser.sprinkler.status !== 'Okay' && !riser.sprinkler.photo_url) {
                    missingPhotos.push(`${f.name}: ${riserName} Sprinkler (${riser.sprinkler.status})`)
                }
                if (riser.hydrant_valve.status !== 'Okay' && riser.hydrant_valve.status !== 'Not Available' && !riser.hydrant_valve.photo_url) {
                    missingPhotos.push(`${f.name}: ${riserName} Hydrant Valve (${riser.hydrant_valve.status})`)
                }
                if (riser.hose_reel.status !== 'Okay' && riser.hose_reel.status !== 'Not Available' && !riser.hose_reel.photo_url) {
                    missingPhotos.push(`${f.name}: ${riserName} Hose Reel (${riser.hose_reel.status})`)
                }
            })
            
            // Refuge Area
            if (f.refuge_area && f.refuge_area.status !== 'Empty' && !f.refuge_area.photo_url) {
                missingPhotos.push(`${f.name}: Refuge Area (${f.refuge_area.status})`)
            }
        })

        // Pumps
        data.pumps.forEach(p => {
            if (p.status === 'Not Working' && !p.photo_url) missingPhotos.push(`Pump: ${p.name} (Not Working)`)
        })

        // Systems
        data.systems.forEach(s => {
            if ((s.status === 'Needs Attention' || s.status === 'Not Operational') && !s.photo_url) missingPhotos.push(`System: ${s.name} (${s.status})`)
        })

        // Rooms
        data.rooms.forEach(r => {
            if (r.extinguisher.status === 'Missing' && !r.extinguisher.photo_url) missingPhotos.push(`Room ${r.name}: Extinguisher Missing`)
        })

        if (missingPhotos.length > 0) {
            setValidationError(`Mandatory Photos Missing for Failed Items:\n\n${missingPhotos.slice(0, 5).join('\n')}${missingPhotos.length > 5 ? '\n...and more' : ''}`)
            return
        }

        setLoading(true)
        try {
            const { score, criticalCount } = calculateCompliance(data)

            // Get user's organization_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) {
                throw new Error('User organization not found')
            }

            // Determine Status
            let status = 'Completed'
            if (criticalCount > 0) status = 'Action Required'
            else if (score < 100) status = 'Completed'

            const { data: newInspection, error } = await supabase.from('inspections').insert({
                client_id: selectedClientId,
                inspector_id: user.id,
                organization_id: profile.organization_id,
                wing: selectedWing,
                date: new Date().toISOString(),
                status: status,
                compliance_score: score,
                critical_issues_count: criticalCount,
                findings: data,
                ai_summary: `Inspection completed. Score: ${score}%. ${criticalCount} critical issues identified.`
            }).select().single()

            if (error) throw error

            // --- Send Email Notification ---
            if (user?.email && newInspection) {
                // 1. Receipt to Inspector
                sendAssignmentEmailAction({
                    inspectorEmail: user.email,
                    inspectorName: user.user_metadata?.full_name || 'Inspector',
                    clientName: selectedClient?.name || 'Unknown Client',
                    date: new Date().toISOString(),
                    inspectionId: newInspection.id
                }).catch(err => console.error('Failed to send assignment email:', err))

                // 2. Critical Alert to Admin (if issues found)
                if (criticalCount > 0) {
                    sendCriticalAlertAction({
                        clientName: selectedClient?.name || 'Unknown Client',
                        issuesCount: criticalCount,
                        inspectionId: newInspection.id
                    }).catch(err => console.error('Failed to send critical alert:', err))
                }
            }

            // --- Auto Schedule Next Inspection ---
            // --- Auto Schedule Next Inspection ---
            try {
                const nextDate = calculateNextInspectionDate(new Date())
                if (!selectedClientId) throw new Error('Client ID missing for scheduling')

                const { error: schedError } = await supabase.from('clients')
                    .update({ next_inspection_date: nextDate.toISOString() })
                    .eq('id', selectedClientId)

                if (schedError) throw schedError

                showToast(`Inspection submitted! Next inspection scheduled for ${nextDate.toLocaleDateString()}`, 'success')
            } catch (schedError: any) {
                console.error('Failed to schedule next inspection:', schedError)
                showToast(`Inspection submitted, but schedule failed: ${schedError.message || 'Unknown error'}`, 'warning')
            }

            router.push('/inspections')

        } catch (error: any) {
            console.error('Submission error object:', error)
            console.error('Submission error JSON:', JSON.stringify(error, null, 2))

            const msg = error.message || error.error_description || 'Failed to submit inspection (Unknown Error)'
            showToast(msg, 'error')
        } finally {
            setLoading(false)
        }
    }

    const { score, criticalCount } = selectedClient ? calculateCompliance(data) : { score: 0, criticalCount: 0 }
    const isCritical = criticalCount > 0
    const scoreColor = score >= 90 ? 'text-green-500' : score >= 70 ? 'text-orange-500' : 'text-red-500'

    // --- Renders ---

    return (
        <div className="space-y-8 pb-20">
            {/* 1. Client Selection */}
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                confirmLabel="Yes, Apply to All"
                showCancel={true}
            />

            {/* 1. Client Selection */}
            <div className="relative z-50 bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 shadow-xl rounded-xl p-6 backdrop-blur-xl transition-all duration-300 overflow-visible! ring-1 ring-black/5">
                <label className="block text-sm font-medium mb-2">Select Client</label>
                <div className="relative">
                    <SearchableSelect
                        options={clients.map(c => ({ value: c.id, label: c.name }))}
                        value={selectedClientId}
                        onChange={setSelectedClientId}
                        placeholder="Search for a client..."
                    />
                </div>
            </div>



            {/* 1.5 Wing Selection (Conditional) */}
            {selectedClient?.wings && selectedClient.wings.length > 0 && (
                <div className="relative z-40 bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 shadow-xl rounded-xl p-6 backdrop-blur-xl transition-all duration-300 ring-1 ring-black/5 -mt-4 animate-fade-in-down">
                    <label className="block text-sm font-medium mb-2">Select Wing / Building</label>
                    <div className="flex flex-wrap gap-2">
                        {selectedClient.wings.map(wing => (
                            <button
                                key={wing}
                                onClick={() => setSelectedWing(wing)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${selectedWing === wing
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-primary/50 text-gray-600 dark:text-gray-300'
                                    }`}
                            >
                                {wing}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedClient && (
                <>
                    {/* 2. Overview */}
                    <div className="liquid-card p-6 bg-primary/5 border-primary/20">
                        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Inspection Overview
                        </h3>
                        {/* Live Score Preview */}
                        <div className="absolute top-4 right-4 flex flex-col items-end">
                            <span className="text-xs font-bold uppercase text-gray-400">Compliance Score</span>
                            <span className={`text-3xl font-black ${scoreColor}`}>
                                {score}%
                            </span>
                            {isCritical && (
                                <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full animate-pulse">
                                    <AlertTriangle className="h-3 w-3" /> Action Required
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                            <div>
                                <span className="text-gray-500 block">Client Type</span>
                                <span className="font-medium">{selectedClient.type}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Address</span>
                                <span className="font-medium">{selectedClient.address}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-gray-500 block">Structure Summary</span>
                                <span className="font-medium font-mono text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                    {(selectedClient.structure?.structure_map || []).join(' → ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Floor-wise Inspection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold px-1">Floor Inspection</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {data.floors.map((floor, idx) => (
                                <div
                                    key={idx}
                                    className={`liquid-card overflow-hidden transition-all duration-300 ${expandedFloors[floor.name] ? 'col-span-1 md:col-span-2 xl:col-span-3 ring-2 ring-primary/20 shadow-2xl scale-[1.01]' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'}`}
                                >
                                    <button
                                        onClick={(e) => {
                                            // Validate: If clicking the card body (not expanding), treat as expand toggle
                                            toggleFloor(floor.name)
                                        }}
                                        className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${expandedFloors[floor.name] ? 'border-b border-gray-100 dark:border-white/10' : ''}`}
                                    >
                                        <span className="font-bold flex items-center gap-2">
                                            <span className="text-gray-400 text-xs uppercase">Floor</span>
                                            <span className="text-primary text-lg">{floor.name}</span>
                                            {floor.refuge_area && (
                                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] border border-green-500/20 font-bold flex items-center gap-1 uppercase tracking-wider">
                                                    <Shield className="h-3 w-3" /> Refuge
                                                </span>
                                            )}
                                        </span>
                                        {expandedFloors[floor.name] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                    </button>

                                    <div
                                        className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${expandedFloors[floor.name] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="p-4 space-y-6">


                                                {/* Floor Inspection - Using new FloorInspectionCard component */}
                                                <FloorInspectionCard
                                                    floor={floor}
                                                    floorIdx={idx}
                                                    data={data}
                                                    setData={setData}
                                                    extinguisherConfig={selectedClient?.structure?.extinguisher_config as ExtinguisherLocationConfig}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Room Inspection */}
                    {data.rooms.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold px-1">Room Inspection</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {data.rooms.map((room, idx) => (
                                    <div key={idx} className="liquid-card p-6">
                                        <h4 className="font-bold text-lg mb-4">{room.name}</h4>
                                        <div className="grid grid-cols-1 gap-6">
                                            {/* Row 1: Common Checks */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Housekeeping</label>
                                                    <div className="flex gap-2">
                                                        {['Good', 'Poor'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => {
                                                                    const newRooms = [...data.rooms]
                                                                    newRooms[idx].housekeeping = opt as any
                                                                    setData({ ...data, rooms: newRooms })
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-sm border ${room.housekeeping === opt ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-white/10'}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Accessibility</label>
                                                    <div className="flex gap-2">
                                                        {['Clear', 'Obstructed'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => {
                                                                    const newRooms = [...data.rooms]
                                                                    newRooms[idx].accessibility = opt as any
                                                                    setData({ ...data, rooms: newRooms })
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-sm border ${room.accessibility === opt ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-white/10'}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Extinguisher Section - Compact */}
                                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                                                        Fire Extinguisher in Room
                                                    </label>
                                                    <div className="flex bg-white dark:bg-black/20 rounded-lg p-1 border border-gray-200 dark:border-white/10">
                                                        {['Available', 'Missing'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => {
                                                                    const newRooms = [...data.rooms]
                                                                    newRooms[idx].extinguisher.status = opt as any
                                                                    setData({ ...data, rooms: newRooms })
                                                                }}
                                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${room.extinguisher.status === opt
                                                                    ? opt === 'Available' ? 'bg-green-500 text-white shadow-sm' : 'bg-red-500 text-white shadow-sm'
                                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {room.extinguisher.status === 'Available' && (
                                                    <div className="space-y-3">
                                                        {Object.entries(room.extinguisher.types).map(([type, count]) => (
                                                            <div key={type} className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                                                                <div className="flex-1 min-w-[120px]">
                                                                    {['ABC', 'CO2', 'Clean Agent', 'ABC Modular', 'Clean Agent Modular', 'Water Type', 'Foam', 'Other'].includes(type) ? (
                                                                        <div className="relative">
                                                                            <select
                                                                                className="w-full bg-transparent text-xs font-bold appearance-none py-1 pl-2 pr-6 focus:outline-none"
                                                                                value={type}
                                                                                onChange={e => {
                                                                                    const newType = e.target.value
                                                                                    if (newType === type) return
                                                                                    const newRooms = [...data.rooms]
                                                                                    const newTypes = { ...newRooms[idx].extinguisher.types }
                                                                                    const currentCount = newTypes[type] || 0
                                                                                    delete newTypes[type]
                                                                                    newTypes[newType] = (newTypes[newType] || 0) + currentCount
                                                                                    newRooms[idx].extinguisher.types = newTypes
                                                                                    setData({ ...data, rooms: newRooms })
                                                                                }}
                                                                            >
                                                                                {['ABC', 'CO2', 'Clean Agent', 'ABC Modular', 'Clean Agent Modular', 'Water Type', 'Foam', 'Other'].map(t => (
                                                                                    <option key={t} value={t}>{t}</option>
                                                                                ))}
                                                                                {/* Keep current if not in list (custom) */}
                                                                                {!['ABC', 'CO2', 'Clean Agent', 'ABC Modular', 'Clean Agent Modular', 'Water Type', 'Foam', 'Other'].includes(type) && (
                                                                                    <option value={type}>{type}</option>
                                                                                )}
                                                                            </select>
                                                                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center">
                                                                            <input
                                                                                type="text"
                                                                                className="w-full bg-transparent text-xs font-bold border-b border-primary/50 focus:outline-none"
                                                                                value={type}
                                                                                autoFocus
                                                                                onChange={e => {
                                                                                    const newType = e.target.value
                                                                                    const newRooms = [...data.rooms]
                                                                                    const newTypes = { ...newRooms[idx].extinguisher.types }
                                                                                    const currentCount = newTypes[type] || 0
                                                                                    delete newTypes[type]
                                                                                    // Prevent empty keys
                                                                                    if (newType) {
                                                                                        newTypes[newType] = currentCount
                                                                                    }
                                                                                    newRooms[idx].extinguisher.types = newTypes
                                                                                    setData({ ...data, rooms: newRooms })
                                                                                }}
                                                                            />
                                                                            <button
                                                                                onClick={() => {
                                                                                     // Revert to Other or ABC?
                                                                                     // effectively delete if empty, handled by trash button
                                                                                }}
                                                                                className="hidden"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Quantity */}
                                                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
                                                                       <button
                                                                           onClick={(e) => {
                                                                               e.preventDefault()
                                                                               const newRooms = [...data.rooms]
                                                                               const current = newRooms[idx].extinguisher.types[type] || 0
                                                                               if (current > 1) {
                                                                                   newRooms[idx].extinguisher.types[type] = current - 1
                                                                                   setData({ ...data, rooms: newRooms })
                                                                               } else {
                                                                                   // Remove if 0? or keep 1?
                                                                                   // Usually trash button removes. keep 1 min.
                                                                               }
                                                                           }}
                                                                           className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white"
                                                                       >
                                                                           <Minus className="h-3 w-3" />
                                                                       </button>
                                                                       <span className="w-8 text-center text-xs font-bold">{count}</span>
                                                                       <button
                                                                           onClick={(e) => {
                                                                               e.preventDefault()
                                                                               const newRooms = [...data.rooms]
                                                                               const current = newRooms[idx].extinguisher.types[type] || 0
                                                                               newRooms[idx].extinguisher.types[type] = current + 1
                                                                               setData({ ...data, rooms: newRooms })
                                                                           }}
                                                                           className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white"
                                                                       >
                                                                           <Plus className="h-3 w-3" />
                                                                       </button>
                                                                </div>

                                                                {/* Remove */}
                                                                <button
                                                                    onClick={() => {
                                                                        const newRooms = [...data.rooms]
                                                                        const newTypes = { ...newRooms[idx].extinguisher.types }
                                                                        delete newTypes[type]
                                                                        newRooms[idx].extinguisher.types = newTypes
                                                                        setData({ ...data, rooms: newRooms })
                                                                    }}
                                                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        <button
                                                            onClick={() => {
                                                                const newRooms = [...data.rooms]
                                                                const newTypes = { ...newRooms[idx].extinguisher.types }
                                                                // Find a type not used
                                                                const validTypes = ['ABC', 'CO2', 'Clean Agent', 'Other']
                                                                const nextType = validTypes.find(t => !newTypes[t]) || 'Other'
                                                                
                                                                if (newTypes[nextType]) {
                                                                    // If Other/Default taken, use timestamp to make unique? No, keys must be unique types.
                                                                    // If 'Other' exists, we should probably add 'Other 2'?
                                                                    // But mapped by type string.
                                                                    // Just add 'New Type'
                                                                    newTypes['New Type'] = 1
                                                                } else {
                                                                    newTypes[nextType] = 1
                                                                }
                                                                
                                                                newRooms[idx].extinguisher.types = newTypes
                                                                setData({ ...data, rooms: newRooms })
                                                            }}
                                                            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline px-1"
                                                        >
                                                            <Plus className="h-3 w-3" /> Add Extinguisher
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. Systems & Pumps */}
                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold px-1">Pumps & Systems</h3>
                        <div className="liquid-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-3 font-bold">Equipment</th>
                                            <th className="px-3 sm:px-6 py-3 font-bold">Status</th>
                                            <th className="px-3 sm:px-6 py-3 font-bold">Pressure / Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {/* Systems (including Custom) */}
                                        {data.systems.map((system, idx) => (
                                            <tr key={`sys-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-3 sm:px-6 py-3 font-medium flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    {system.name}
                                                </td>
                                                <td className="px-3 sm:px-6 py-3">
                                                    <select
                                                        className="liquid-input w-full text-sm py-2"
                                                        value={system.status}
                                                        onChange={e => {
                                                            const newSystems = [...data.systems]
                                                            newSystems[idx].status = e.target.value as any
                                                            setData({ ...data, systems: newSystems })
                                                        }}
                                                    >
                                                        <option value="Satisfactory">Satisfactory</option>
                                                        <option value="Needs Attention">Needs Attention</option>
                                                        <option value="Not Operational" className="text-red-500 font-bold">Not Operational</option>
                                                        <option value="Does Not Exist">Does Not Exist</option>
                                                    </select>
                                                    {(system.status === 'Needs Attention' || system.status === 'Not Operational') && (
                                                        <div className="mt-2">
                                                            <PhotoUpload
                                                                required={true}
                                                                currentUrl={system.photo_url}
                                                                onUpload={(url) => {
                                                                    const newSystems = [...data.systems]
                                                                    newSystems[idx].photo_url = url
                                                                    setData({ ...data, systems: newSystems })
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-6 py-3">
                                                    <input
                                                        type="text"
                                                        className="liquid-input w-full text-sm py-2"
                                                        placeholder="Notes..."
                                                        value={system.notes}
                                                        onChange={e => {
                                                            const newSystems = [...data.systems]
                                                            newSystems[idx].notes = e.target.value
                                                            setData({ ...data, systems: newSystems })
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Pumps */}
                                        {data.pumps.map((pump, idx) => (
                                            <tr key={`pump-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-3 sm:px-6 py-3 font-medium flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                    {pump.name}
                                                </td>
                                                <td className="px-3 sm:px-6 py-3">
                                                    <select
                                                        className="liquid-input w-full text-sm py-2"
                                                        value={pump.status}
                                                        onChange={e => {
                                                            const newPumps = [...data.pumps]
                                                            newPumps[idx].status = e.target.value as any
                                                            setData({ ...data, pumps: newPumps })
                                                        }}
                                                    >
                                                        <option value="Auto (Working)">Auto (Working)</option>
                                                        <option value="Manual (Working)">Manual (Working)</option>
                                                        <option value="Not Working" className="text-red-500 font-bold">Not Working</option>
                                                        <option value="Does Not Exist">Does Not Exist</option>
                                                    </select>
                                                    {pump.status === 'Not Working' && (
                                                        <div className="mt-2">
                                                            <PhotoUpload
                                                                required={true}
                                                                currentUrl={pump.photo_url}
                                                                onUpload={(url) => {
                                                                    const newPumps = [...data.pumps]
                                                                    newPumps[idx].photo_url = url
                                                                    setData({ ...data, pumps: newPumps })
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        className="liquid-input w-full text-sm py-2"
                                                        placeholder="Pressure / Remarks..."
                                                        value={pump.remarks}
                                                        onChange={e => {
                                                            const newPumps = [...data.pumps]
                                                            newPumps[idx].remarks = e.target.value
                                                            setData({ ...data, pumps: newPumps })
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 6. Summary */}
                    <LiquidCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Overall Remarks <span className="text-red-500">*</span></h3>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsGeneratingOverallSummary(true)
                                    try {
                                        // 1. Check for Custom API Settings
                                        let aiConfig = undefined
                                        const stored = localStorage.getItem('fireeye_api_settings')
                                        if (stored) {
                                            const parsed = JSON.parse(stored)
                                            if (parsed.useCustom && parsed.apiKey) {
                                                aiConfig = { apiKey: parsed.apiKey, model: parsed.model }
                                                console.log('Using Custom AI Settings:', parsed.model)
                                            }
                                        }

                                        const res = await generateSmartSummary(data, aiConfig)
                                        if (res.text) {
                                            setData({ ...data, remarks: res.text })
                                        }
                                    } catch (err) {
                                        console.error(err)
                                    } finally {
                                        setIsGeneratingOverallSummary(false)
                                    }
                                }}
                                disabled={isGeneratingOverallSummary}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-md transition-all hover:scale-105 disabled:opacity-70 disabled:scale-100"
                            >
                                {isGeneratingOverallSummary ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3 w-3" />
                                )}
                                {isGeneratingOverallSummary ? 'Generating Report...' : 'Generate Executive Report'}
                            </button>
                        </div>
                        <textarea
                            className="liquid-input w-full"
                            rows={4}
                            placeholder="Final observations and summary..."
                            value={data.remarks}
                            onChange={e => setData({ ...data, remarks: e.target.value })}
                        />
                    </LiquidCard>

                    <div className="flex justify-end pt-4">
                        <LiquidButton
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full md:w-auto"
                        >
                            {loading ? <FireEyeLoader size="xs" className="mr-2" /> : <Save className="mr-2" />}
                            Submit Inspection
                        </LiquidButton>
                    </div>
                </>
            )
            }

            <ConfirmationModal
                isOpen={!!validationError}
                title="Validation Error"
                message={validationError}
                onConfirm={() => setValidationError(null)}
                onCancel={() => setValidationError(null)}
                confirmLabel="OK"
                showCancel={false}
            />
        </div >
    )
}
