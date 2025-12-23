'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { Save, MapPin, Building, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Shield, Sparkles } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import { LiquidCard, LiquidButton, LiquidCheckbox } from '@/components/Liquid'
import SearchableSelect from '@/components/SearchableSelect'
import ConfirmationModal from '@/components/ConfirmationModal'
import PhotoUpload from '@/components/PhotoUpload'
import { generateInspectionSummary } from '@/lib/smartSummary'
import { calculateNextInspectionDate } from '@/lib/scheduling'

// --- Types ---

type Client = {
    id: string
    name: string
    address: string
    type: 'Office/Store' | 'Society/Residential'
    structure: {
        basements: number
        podiums: number
        floors: number
        structure_map: string[]
        rooms: string[]
        systems: string[]
        refuge_floors?: string[]
    }
}

export type ExtinguisherType = 'ABC' | 'CO2' | 'ABC Modular' | 'Clean Agent' | 'Clean Agent Modular' | 'FM-200' | 'Water Type'

export type FloorData = {
    name: string
    extinguisher: {
        status: 'OK' | 'Pressure Low' | 'Expired' | 'Not Available'
        types: Partial<Record<ExtinguisherType, number>>
        photo_url?: string
    }
    hydrant?: {
        valve: 'OK' | 'Leaking' | 'Jam' | 'Lugs / Wheel Missing' | 'N/A',
        valve_photo_url?: string
        hose: 'OK' | 'Leaking' | 'Jammed / Stuck' | 'Damaged' | 'Missing' | 'Not Available' | 'N/A'
        hose_photo_url?: string
    }
    sprinkler?: { status: 'OK' | 'Leaking' | 'Painted' | 'N/A', photo_url?: string }
    alarm?: { status: 'OK' | 'Fault' | 'N/A', photo_url?: string }
    refuge_area?: { status: 'Open' | 'Locked' | 'Obstructed / Occupied', photo_url?: string }
}

export type RoomData = {
    name: string
    housekeeping: 'Good' | 'Poor'
    housekeeping_photo_url?: string // Optional
    accessibility: 'Clear' | 'Obstructed'
    accessibility_photo_url?: string // Optional
    extinguisher: {
        status: 'Available' | 'Missing'
        types: Partial<Record<ExtinguisherType, number>>
        photo_url?: string
    }
    remarks: string
}

export type SystemData = {
    name: string
    status: 'Satisfactory' | 'Needs Attention' | 'Not Operational' | 'Does Not Exist'
    notes: string
    photo_url?: string
}

export type PumpData = {
    name: string
    status: 'Auto (Working)' | 'Manual (Working)' | 'Not Working' | 'N/A' | 'Does Not Exist'
    pressure: string
    remarks: string
    photo_url?: string
}

export type InspectionData = {
    floors: FloorData[]
    rooms: RoomData[]
    systems: SystemData[]
    pumps: PumpData[]
    remarks: string
}

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

    // 1. Floors (Extinguishers, Hydrants, Sprinklers, Alarms)
    data.floors.forEach(f => {
        // Extinguisher (Weight 3)
        totalWeight += WEIGHTS['Fire Extinguisher']
        if (f.extinguisher.status === 'OK') obtainedWeight += WEIGHTS['Fire Extinguisher']
        if (f.extinguisher.status === 'Expired' || f.extinguisher.status === 'Not Available') criticalCount++

        // Hydrant (Weight 3)
        if (f.hydrant) {
            // Check Valve
            if (f.hydrant.valve) {
                totalWeight += (WEIGHTS['Hydrant System'] / 2)
                if (f.hydrant.valve === 'OK') obtainedWeight += (WEIGHTS['Hydrant System'] / 2)
                if (f.hydrant.valve === 'Leaking' || f.hydrant.valve === 'Jam' || f.hydrant.valve === 'Lugs / Wheel Missing') criticalCount++
            }

            // Check Hose Reel Drum
            if (f.hydrant.hose) {
                totalWeight += (WEIGHTS['Hydrant System'] / 2)
                if (f.hydrant.hose === 'OK') obtainedWeight += (WEIGHTS['Hydrant System'] / 2)
                if (['Leaking', 'Jammed / Stuck', 'Damaged'].includes(f.hydrant.hose)) {
                    criticalCount++
                }
            }
        }

        // Sprinkler (Weight 4)
        if (f.sprinkler && f.sprinkler.status !== 'N/A') {
            totalWeight += WEIGHTS['Sprinkler System']
            if (f.sprinkler.status === 'OK') obtainedWeight += WEIGHTS['Sprinkler System']
            if (f.sprinkler.status === 'Leaking') criticalCount++
        }

        // Alarm (Weight 5)
        if (f.alarm && f.alarm.status !== 'N/A') {
            totalWeight += WEIGHTS['Fire Alarm System']
            if (f.alarm.status === 'OK') obtainedWeight += WEIGHTS['Fire Alarm System']
            if (f.alarm.status === 'Fault') criticalCount++
        }

        // Refuge Area
        if (f.refuge_area) {
            totalWeight += 5
            if (f.refuge_area.status === 'Open') obtainedWeight += 5
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
        if (p.status !== 'N/A' && p.status !== 'Does Not Exist') {
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

    // Form State
    const [data, setData] = useState<InspectionData>({
        floors: [],
        rooms: [],
        systems: [],
        pumps: [],
        remarks: ''
    })
    const [loading, setLoading] = useState(false)

    const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({})
    const [validationError, setValidationError] = useState<string | null>(null)
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, message: string }>({
        isOpen: false,
        onConfirm: () => { },
        title: '',
        message: ''
    })

    // Initialize Form when Client Selected
    useEffect(() => {
        if (!selectedClientId) {
            setSelectedClient(null)
            return
        }

        const client = clients.find(c => c.id === selectedClientId) as Client
        if (client) {
            setSelectedClient(client)

            // Generate Initial Data Structure
            const structure = client.structure || {}
            const refugeFloors = structure.refuge_floors || []

            // 1. Floors
            const floors: FloorData[] = (structure.structure_map || []).map(floor => ({
                name: floor,
                extinguisher: { status: 'OK', types: { 'ABC': 1 } },
                hydrant: undefined,
                sprinkler: undefined,
                alarm: undefined,
                refuge_area: refugeFloors.includes(floor) ? { status: 'Open' } : undefined
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

            // 4. Pumps (Dynamic based on Systems)
            const pumps: PumpData[] = []
            const sys = structure.systems || []

            const hasHydrantSystems = sys.includes('Hydrant Valve') || sys.includes('Hose Reel Drum')
            const hasSprinklerSystem = sys.includes('Sprinkler System')

            if (hasHydrantSystems) {
                pumps.push(
                    { name: 'Main Pump - Hydrant', status: 'N/A', pressure: '', remarks: '' },
                    { name: 'Jockey Pump - Hydrant', status: 'N/A', pressure: '', remarks: '' }
                )
            }

            if (hasSprinklerSystem) {
                pumps.push(
                    { name: 'Main Pump - Sprinkler', status: 'N/A', pressure: '', remarks: '' },
                    { name: 'Jockey Pump - Sprinkler', status: 'N/A', pressure: '', remarks: '' }
                )
            }

            // Common pumps if ANY water-based system exists
            if (hasHydrantSystems || hasSprinklerSystem) {
                pumps.push(
                    { name: 'Booster Pump', status: 'N/A', pressure: '', remarks: '' },
                    { name: 'Diesel Pump', status: 'N/A', pressure: '', remarks: '' }
                )
            }

            // Enable optional fields in floors based on systems
            const hasHydrant = structure.systems?.includes('Hydrant Valve') || structure.systems?.includes('Hose Reel Drum')
            const hasSprinkler = structure.systems?.includes('Sprinkler System')
            const hasAlarm = structure.systems?.includes('Fire Alarm System')

            if (hasHydrant) {
                floors.forEach(f => f.hydrant = { valve: 'OK', hose: 'OK' })
            }
            if (hasSprinkler) {
                floors.forEach(f => f.sprinkler = { status: 'OK' })
            }
            if (hasAlarm) {
                floors.forEach(f => f.alarm = { status: 'OK' })
            }

            setData({ floors, rooms, systems, pumps, remarks: '' })

            // Auto expand first floor
            if (floors.length > 0) {
                setExpandedFloors({ [floors[0].name]: true })
            }
        }
    }, [selectedClientId, clients])

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

        // 2. Pumps Required
        const unselectedPumps = data.pumps.filter(p => p.status === 'N/A')
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
            if (f.extinguisher.status !== 'OK' && f.extinguisher.status !== 'Not Available' && !f.extinguisher.photo_url) missingPhotos.push(`${f.name}: Extinguisher (${f.extinguisher.status})`)

            if (f.hydrant) {
                if (f.hydrant.valve !== 'OK' && f.hydrant.valve !== 'N/A' && !f.hydrant.valve_photo_url) missingPhotos.push(`${f.name}: Hydrant Valve (${f.hydrant.valve})`)
                if (f.hydrant.hose !== 'OK' && f.hydrant.hose !== 'N/A' && f.hydrant.hose !== 'Not Available' && !f.hydrant.hose_photo_url) missingPhotos.push(`${f.name}: Hose Reel (${f.hydrant.hose})`)
            }
            if (f.sprinkler && f.sprinkler.status !== 'OK' && f.sprinkler.status !== 'N/A' && !f.sprinkler.photo_url) missingPhotos.push(`${f.name}: Sprinkler (${f.sprinkler.status})`)
            if (f.alarm && f.alarm.status !== 'OK' && f.alarm.status !== 'N/A' && !f.alarm.photo_url) missingPhotos.push(`${f.name}: Alarm (${f.alarm.status})`)
            if (f.refuge_area && f.refuge_area.status !== 'Open' && !f.refuge_area.photo_url) missingPhotos.push(`${f.name}: Refuge Area (${f.refuge_area.status})`)
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

            // Determine Status
            let status = 'Completed'
            if (criticalCount > 0) status = 'Action Required'
            else if (score < 100) status = 'Completed'

            const { error } = await supabase.from('inspections').insert({
                client_id: selectedClientId,
                inspector_id: user.id,
                status: status,
                compliance_score: score,
                critical_issues_count: criticalCount,
                findings: data,
                ai_summary: `Inspection completed. Score: ${score}%. ${criticalCount} critical issues identified.`
            })

            if (error) throw error

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
            console.error('Submission error:', error)
            showToast(error.message || 'Failed to submit', 'error')
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
                                                {/* Refuge Area Inspection */}
                                                {floor.refuge_area && (
                                                    <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl mb-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                                                                <Shield className="h-5 w-5" /> Refuge Area Inspection
                                                            </h4>
                                                        </div>
                                                        <div className="grid grid-cols-1">
                                                            <div>
                                                                <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Accessibility Status</label>
                                                                <select
                                                                    className={`liquid-input w-full text-sm font-medium ${floor.refuge_area.status !== 'Open'
                                                                        ? 'border-red-500 bg-red-50 text-red-600'
                                                                        : 'border-green-500/30'
                                                                        }`}
                                                                    value={floor.refuge_area.status}
                                                                    onChange={e => {
                                                                        const newFloors = [...data.floors]
                                                                        newFloors[idx].refuge_area!.status = e.target.value as any
                                                                        setData({ ...data, floors: newFloors })
                                                                    }}
                                                                >
                                                                    <option value="Obstructed / Occupied">Obstructed / Occupied</option>
                                                                </select>
                                                                {floor.refuge_area.status !== 'Open' && (
                                                                    <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                                                                        <AlertTriangle className="h-3 w-3" /> Critical Failure: Refuge Area must be accessible always.
                                                                    </p>
                                                                )}

                                                                {floor.refuge_area.status !== 'Open' && (
                                                                    <div className="mt-3">
                                                                        <PhotoUpload
                                                                            required={true}
                                                                            label="Proof of Obstruction"
                                                                            currentUrl={floor.refuge_area.photo_url}
                                                                            onUpload={(url) => {
                                                                                const newFloors = [...data.floors]
                                                                                newFloors[idx].refuge_area!.photo_url = url
                                                                                setData({ ...data, floors: newFloors })
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Dynamic Single Line for Floor Inspection */}
                                                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center bg-gray-50/50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">

                                                    {/* 1. Fire Extinguisher (Status & Types) */}
                                                    <div className={`flex-1 min-w-[300px] ${!floor.hydrant ? 'w-full' : ''}`}>
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                                                <h4 className="text-xs font-bold uppercase text-gray-500 whitespace-nowrap">Fire Extinguisher</h4>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
                                                                {/* Status */}
                                                                <div className={`transition-all duration-300 ${floor.extinguisher.status === 'Not Available' ? 'flex-1 w-full' : 'min-w-[160px] w-[160px]'}`}>
                                                                    <select
                                                                        className="liquid-input w-full text-xs py-2 h-10 leading-relaxed"
                                                                        value={floor.extinguisher.status}
                                                                        onChange={e => {
                                                                            const newFloors = [...data.floors]
                                                                            newFloors[idx].extinguisher.status = e.target.value as any
                                                                            setData({ ...data, floors: newFloors })
                                                                        }}
                                                                    >
                                                                        <option value="OK">OK</option>
                                                                        <option value="Pressure Low">Pressure Low</option>
                                                                        <option value="Expired">Expired</option>
                                                                        <option value="Not Available">Not Available</option>
                                                                    </select>

                                                                    {/* Photo Upload for Extinguisher */}
                                                                    {floor.extinguisher.status !== 'OK' && floor.extinguisher.status !== 'Not Available' && (
                                                                        <div className="mt-2">
                                                                            <PhotoUpload
                                                                                required={true}
                                                                                currentUrl={floor.extinguisher.photo_url}
                                                                                onUpload={(url) => {
                                                                                    const newFloors = [...data.floors]
                                                                                    newFloors[idx].extinguisher.photo_url = url
                                                                                    setData({ ...data, floors: newFloors })
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Types */}
                                                                {floor.extinguisher.status !== 'Not Available' && (
                                                                    <div className="flex-1 flex flex-wrap items-center gap-2">
                                                                        <div className="h-8 w-px bg-gray-200 dark:bg-white/10 hidden sm:block mx-1"></div>
                                                                        {['ABC', 'CO2'].map((type) => {
                                                                            const count = floor.extinguisher.types?.[type as ExtinguisherType] || 0
                                                                            const isSelected = count > 0

                                                                            return (
                                                                                <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all h-9 ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/20'}`}>
                                                                                    <LiquidCheckbox
                                                                                        checked={isSelected}
                                                                                        onCheckedChange={(checked) => {
                                                                                            const newFloors = [...data.floors]
                                                                                            const newTypes = { ...floor.extinguisher.types }
                                                                                            if (checked) {
                                                                                                newTypes[type as ExtinguisherType] = 1
                                                                                            } else {
                                                                                                delete newTypes[type as ExtinguisherType]
                                                                                            }
                                                                                            newFloors[idx].extinguisher.types = newTypes
                                                                                            setData({ ...data, floors: newFloors })
                                                                                        }}
                                                                                    />
                                                                                    <span className="text-xs font-bold whitespace-nowrap">{type}</span>

                                                                                    {isSelected && (
                                                                                        <>
                                                                                            <div className="w-px h-3 bg-gray-300 dark:bg-white/20 mx-1"></div>
                                                                                            <div className="flex items-center gap-1">
                                                                                                <input
                                                                                                    type="number"
                                                                                                    min="1"
                                                                                                    className="w-8 bg-transparent border-none text-center font-mono text-xs font-bold focus:ring-0 p-0"
                                                                                                    value={count}
                                                                                                    onChange={e => {
                                                                                                        const val = parseInt(e.target.value) || 0
                                                                                                        if (val > 0) {
                                                                                                            const newFloors = [...data.floors]
                                                                                                            newFloors[idx].extinguisher.types![type as ExtinguisherType] = val
                                                                                                            setData({ ...data, floors: newFloors })
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                                <div className="flex flex-col -gap-1">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.preventDefault()
                                                                                                            e.stopPropagation()
                                                                                                            const newFloors = [...data.floors]
                                                                                                            const current = newFloors[idx].extinguisher.types![type as ExtinguisherType] || 0
                                                                                                            newFloors[idx].extinguisher.types![type as ExtinguisherType] = current + 1
                                                                                                            setData({ ...data, floors: newFloors })
                                                                                                        }}
                                                                                                        className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                                                                                    >
                                                                                                        <ChevronUp className="h-3 w-3" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.preventDefault()
                                                                                                            e.stopPropagation()
                                                                                                            const newFloors = [...data.floors]
                                                                                                            const current = newFloors[idx].extinguisher.types![type as ExtinguisherType] || 0
                                                                                                            if (current > 1) {
                                                                                                                newFloors[idx].extinguisher.types![type as ExtinguisherType] = current - 1
                                                                                                                setData({ ...data, floors: newFloors })
                                                                                                            }
                                                                                                        }}
                                                                                                        className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                                                                                    >
                                                                                                        <ChevronDown className="h-3 w-3" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                        {/* Apply To All Button */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()
                                                                                setConfirmModal({
                                                                                    isOpen: true,
                                                                                    title: 'Apply Types to All Floors?',
                                                                                    message: `This will verify and copy the current extinguisher types configuration (ABC: ${floor.extinguisher.types?.ABC || 0}, CO2: ${floor.extinguisher.types?.CO2 || 0}) to ALL ${data.floors.length} floors.`,
                                                                                    onConfirm: () => {
                                                                                        const currentTypes = { ...floor.extinguisher.types }
                                                                                        const newFloors = data.floors.map(f => ({
                                                                                            ...f,
                                                                                            extinguisher: {
                                                                                                ...f.extinguisher,
                                                                                                types: { ...currentTypes }
                                                                                            }
                                                                                        }))
                                                                                        setData({ ...data, floors: newFloors })
                                                                                        showToast('Extinguisher types applied to all floors', 'success')
                                                                                        setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                                                    }
                                                                                })
                                                                            }}
                                                                            className="ml-auto sm:ml-2 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md border border-primary/10"
                                                                            title="Apply types to all floors"
                                                                        >
                                                                            <CheckCircle className="h-3 w-3" /> All
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 2 & 3. Hydrant & Hose Reel (Conditional) */}
                                                    {floor.hydrant && (
                                                        <>
                                                            <div className="w-px h-12 bg-gray-200 dark:bg-white/10 hidden xl:block"></div>

                                                            {/* Hydrant Valve */}
                                                            <div className="min-w-[180px]">
                                                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Hydrant Valve</label>
                                                                <select
                                                                    className="liquid-input w-full text-xs py-2 h-10 leading-relaxed"
                                                                    value={floor.hydrant.valve as string}
                                                                    onChange={e => {
                                                                        const newFloors = [...data.floors]
                                                                        newFloors[idx].hydrant!.valve = e.target.value as any
                                                                        setData({ ...data, floors: newFloors })
                                                                    }}
                                                                >
                                                                    <option value="OK">OK</option>
                                                                    <option value="Leaking">Leaking</option>
                                                                    <option value="Jam">Jam/Stuck</option>
                                                                    <option value="Lugs / Wheel Missing">Lugs / Wheel Missing</option>
                                                                </select>
                                                            </div>

                                                            {/* Hose Reel */}
                                                            <div className="min-w-[180px]">
                                                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Hose Reel Drum</label>
                                                                <select
                                                                    className="liquid-input w-full text-xs py-2 h-10 leading-relaxed"
                                                                    value={floor.hydrant.hose as string}
                                                                    onChange={e => {
                                                                        const newFloors = [...data.floors]
                                                                        newFloors[idx].hydrant!.hose = e.target.value as any
                                                                        setData({ ...data, floors: newFloors })
                                                                    }}
                                                                >
                                                                    <option value="OK">OK</option>
                                                                    <option value="Leaking">Leaking</option>
                                                                    <option value="Jammed / Stuck">Jammed / Stuck</option>
                                                                    <option value="Damaged">Damaged</option>
                                                                    <option value="Not Available">Not Available</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
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
                                                    <div className="flex flex-wrap gap-2">
                                                        {['ABC', 'CO2', 'ABC Modular', 'Clean Agent', 'Clean Agent Modular', 'FM-200', 'Water Type'].map((type) => {
                                                            const count = room.extinguisher.types?.[type as ExtinguisherType] || 0
                                                            const isSelected = count > 0

                                                            return (
                                                                <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all h-9 ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/20'}`}>
                                                                    <LiquidCheckbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={(checked) => {
                                                                            const newRooms = [...data.rooms]
                                                                            const newTypes = { ...newRooms[idx].extinguisher.types }
                                                                            if (checked) {
                                                                                newTypes[type as ExtinguisherType] = 1
                                                                            } else {
                                                                                delete newTypes[type as ExtinguisherType]
                                                                            }
                                                                            newRooms[idx].extinguisher.types = newTypes
                                                                            setData({ ...data, rooms: newRooms })
                                                                        }}
                                                                    />
                                                                    <span className="text-xs font-bold whitespace-nowrap">{type}</span>

                                                                    {isSelected && (
                                                                        <>
                                                                            <div className="w-px h-3 bg-gray-300 dark:bg-white/20 mx-1"></div>
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    className="w-8 bg-transparent border-none text-center font-mono text-xs font-bold focus:ring-0 p-0"
                                                                                    value={count}
                                                                                    onChange={e => {
                                                                                        const val = parseInt(e.target.value) || 0
                                                                                        if (val > 0) {
                                                                                            const newRooms = [...data.rooms]
                                                                                            newRooms[idx].extinguisher.types![type as ExtinguisherType] = val
                                                                                            setData({ ...data, rooms: newRooms })
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <div className="flex flex-col -gap-1">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            const newRooms = [...data.rooms]
                                                                                            const current = newRooms[idx].extinguisher.types![type as ExtinguisherType] || 0
                                                                                            newRooms[idx].extinguisher.types![type as ExtinguisherType] = current + 1
                                                                                            setData({ ...data, rooms: newRooms })
                                                                                        }}
                                                                                        className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                                                                    >
                                                                                        <ChevronUp className="h-3 w-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            const newRooms = [...data.rooms]
                                                                                            const current = newRooms[idx].extinguisher.types![type as ExtinguisherType] || 0
                                                                                            if (current > 1) {
                                                                                                newRooms[idx].extinguisher.types![type as ExtinguisherType] = current - 1
                                                                                                setData({ ...data, rooms: newRooms })
                                                                                            }
                                                                                        }}
                                                                                        className="text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                                                                    >
                                                                                        <ChevronDown className="h-3 w-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
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
                                            <th className="px-6 py-4 font-bold">Equipment</th>
                                            <th className="px-6 py-4 font-bold">Status</th>
                                            <th className="px-6 py-4 font-bold">Pressure / Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {/* Systems (including Custom) */}
                                        {data.systems.map((system, idx) => (
                                            <tr key={`sys-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    {system.name}
                                                </td>
                                                <td className="px-6 py-4">
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
                                                <td className="px-6 py-4">
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
                                                <td className="px-6 py-4 font-medium flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                    {pump.name}
                                                </td>
                                                <td className="px-6 py-4">
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
                                                        <option value="N/A">N/A</option>
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
                                onClick={() => {
                                    const summary = generateInspectionSummary(data)
                                    setData({ ...data, remarks: summary })
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-md transition-all hover:scale-105"
                            >
                                <Sparkles className="h-3 w-3" />
                                Fill with AI
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
