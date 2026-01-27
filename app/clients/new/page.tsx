'use client'

import { useState, useEffect } from 'react'
import { isValidEmail, isValidPhone } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import PageHeader from '@/components/PageHeader'
import { LiquidInput } from '@/components/Liquid'
import FireEyeLoader from '@/components/FireEyeLoader'
import DateInput from '@/components/DateInput'
import { Loader2, Plus, Building, Store, Check, MapPin, Phone, Mail, X, Calendar, Minus, ChevronDown } from 'lucide-react'
import PumpConfiguration from '@/components/ClientForms/PumpConfiguration'
import InventoryConfiguration from '@/components/ClientForms/InventoryConfiguration'
import { Pump, FireAlarmConfig, ExtinguisherRow, ExtinguisherType, ExtinguisherConfigItem, ExtinguisherLocationConfig } from '@/components/ClientForms/types'

const EXTINGUISHER_TYPES: ExtinguisherType[] = ['ABC', 'CO2', 'Clean Agent', 'ABC Modular', 'Clean Agent Modular', 'Other']

// Types
type ClientType = 'Office/Store' | 'Society/Residential'

interface ClientForm {
    name: string
    address: string
    phone: string
    email: string
    type: ClientType
    // Society Structure
    basements: number
    podiums: number
    residential_floors: number
    // Refuge Area
    hasRefugeArea: boolean
    refugeFloors: string[]
    // Infrastructure
    rooms: string[]
    systems: string[]
    next_inspection_date?: string
    // Fire Safety Config
    riser_count: number
    extinguisher_pattern: 'Lobby Only' | 'Staircase Only' | 'Both'
    // Extended Admin Config
    pumps: Pump[]
    fire_alarm: FireAlarmConfig
    extinguishers: ExtinguisherRow[]
    extinguisher_config: ExtinguisherLocationConfig
    hydrant_points_qty: number
    hose_reel_drum_qty: number
}

const DEFAULT_ROOMS = ['Lift Room', 'Meter Room', 'Pump Room', 'Electrical Panel / Electrical Room', 'Server Room']
const OPTIONAL_SYSTEMS = [
    'Fire Alarm System',
    'Hydrant Valve',
    'Hose Reel Drum',
    'Sprinkler System'
]

export default function NewClientPage() {
    const router = useRouter()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [verifying, setVerifying] = useState(true)

    // Form State
    const [form, setForm] = useState<ClientForm>({
        name: '',
        address: '',
        phone: '',
        email: '',
        type: 'Society/Residential',
        basements: 0,
        podiums: 0,
        residential_floors: 0,
        hasRefugeArea: false,
        refugeFloors: [],
        rooms: [...DEFAULT_ROOMS],
        systems: OPTIONAL_SYSTEMS, // Default to all systems selected
        riser_count: 1,
        extinguisher_pattern: 'Both',
        pumps: [
            { id: '1', name: 'Hydrant Jockey Pump', type: 'Monoblock', hp: 0 },
            { id: '2', name: 'Main Hydrant Pump', type: 'Monoblock', hp: 0 },
            { id: '3', name: 'Sprinkler Jockey Pump', type: 'Monoblock', hp: 0 },
            { id: '4', name: 'Main Sprinkler Pump', type: 'Monoblock', hp: 0 },
        ],
        fire_alarm: {
            panel_qty: 1,
            smoke_detector_qty: 0,
            heat_detector_qty: 0,
            mcp_qty: 0,
            hooter_qty: 0
        },
        extinguishers: [],
        extinguisher_config: {
            'Lobby': [{ id: '1', type: 'ABC', count: 1 }],
            'Staircase': [{ id: '2', type: 'CO2', count: 1 }]
        },
        hydrant_points_qty: 0,
        hose_reel_drum_qty: 0
    })

    const [customRoom, setCustomRoom] = useState('')
    const [customSystem, setCustomSystem] = useState('')

    // Address Autosuggest State
    type AddressSuggestion = {
        display_name: string
        lat: string
        lon: string
    }
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([])
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

    const handleAddressSearch = (query: string) => {
        if (searchTimeout) clearTimeout(searchTimeout)
        if (query.length < 3) {
            setAddressSuggestions([])
            return
        }

        const timeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
                if (res.ok) {
                    const data = await res.json()
                    setAddressSuggestions(data)
                }
            } catch (error) {
                console.error("Address search failed", error)
            }
        }, 500) // 500ms debounce

        setSearchTimeout(timeout)
    }

    const selectAddress = (suggestion: AddressSuggestion) => {
        setForm(prev => ({ ...prev, address: suggestion.display_name }))
        setAddressSuggestions([])
    }

    // Verify Admin Access
    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                showToast('Access Denied: Only Admins can add clients.', 'error')
                router.push('/dashboard')
            } else {
                setIsAdmin(true)
            }
            setVerifying(false)
        }
        checkAdmin()
    }, [router, showToast])

    // Auto-Calculation Logic
    useEffect(() => {
        // Floor Logic
        const isSociety = form.type === 'Society/Residential'
        const totalFloors = isSociety 
            ? (form.basements + form.podiums + form.residential_floors + 1) // +1 for Terrace
            : 1 // Office/Store = 1 unit
        
        const risers = form.riser_count

        // Calculate Extinguishers from Config
        const activePatterns = []
        if (form.extinguisher_pattern === 'Both' || form.extinguisher_pattern === 'Lobby Only') activePatterns.push('Lobby')
        if (form.extinguisher_pattern === 'Both' || form.extinguisher_pattern === 'Staircase Only') activePatterns.push('Staircase')

        // Aggregate counts by type
        const typeCounts: Record<string, number> = {}
        
        activePatterns.forEach(pattern => {
            const configItems = form.extinguisher_config[pattern] || []
            configItems.forEach(item => {
                const totalQty = item.count * totalFloors
                typeCounts[item.type] = (typeCounts[item.type] || 0) + totalQty
            })
        })

        // Generate ID-stable inventory rows
        const newExtinguisherRows = Object.entries(typeCounts).map(([type, qty], idx) => ({
            id: `auto-${idx}`, // Simple ID strategy for auto-generated rows
            type: type,
            capacity: type.includes('CO2') ? '4.5 KG' : '6 KG', // Rough defaults
            quantity: qty
        }))

        // Update counts
        setForm(prev => {
             return {
                 ...prev,
                 fire_alarm: {
                     ...prev.fire_alarm,
                     mcp_qty: totalFloors,
                     smoke_detector_qty: totalFloors,
                     hooter_qty: totalFloors
                 },
                 hydrant_points_qty: totalFloors * risers,
                 hose_reel_drum_qty: totalFloors * risers,
                 extinguishers: newExtinguisherRows // Completely replace or merge? Replacing is safer for strict auto-calc mode.
             }
        })
    }, [form.basements, form.podiums, form.residential_floors, form.riser_count, form.extinguisher_pattern, form.type, form.extinguisher_config])

    const updateExtinguisherConfig = (location: string, items: ExtinguisherConfigItem[]) => {
        setForm(prev => ({
            ...prev,
            extinguisher_config: {
                ...prev.extinguisher_config,
                [location]: items
            }
        }))
    }

    const calculateStructure = () => {
        const structure: string[] = []

        // Basements
        for (let i = 1; i <= form.basements; i++) structure.push(`B${i}`)

        // Ground
        structure.push('Ground')

        // Podiums
        for (let i = 1; i <= form.podiums; i++) structure.push(`P${i}`)

        // Residential Floors
        for (let i = 1; i <= form.residential_floors; i++) structure.push(`Floor ${i + form.podiums}`)

        // Terrace
        structure.push('Terrace')

        return structure
    }

    const [errors, setErrors] = useState<Partial<Record<keyof ClientForm, string>>>({})

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: typeof errors = {}

        if (!form.name.trim()) newErrors.name = 'Please enter the client name'
        if (!form.address.trim()) newErrors.address = 'Please enter the full address'
        if (!isValidPhone(form.phone)) newErrors.phone = 'Please enter a valid phone number (min 10 digits)'
        if (!isValidEmail(form.email)) newErrors.email = 'Please enter a valid email address'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setErrors({})
        setLoading(true)

        try {
            // Validator: Check Pump HP
            const invalidPumps = form.pumps.filter(p => !p.hp || p.hp <= 0)
            if (invalidPumps.length > 0) {
                showToast(`Pump capacity cannot be 0. Please update: ${invalidPumps.map(p => p.name || 'Unnamed Pump').join(', ')}`, 'error')
                setLoading(false)
                return
            }

            const structureMap = form.type === 'Society/Residential' ? calculateStructure() : ['Ground']

            // Get current user's organization_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) throw new Error('No organization found')

            const { error } = await supabase.from('clients').insert({
                name: form.name,
                address: form.address,
                phone: form.phone,
                email: form.email,
                type: form.type,
                organization_id: profile.organization_id,
                next_inspection_date: form.next_inspection_date || null,
                structure: {
                    basements: form.basements,
                    podiums: form.podiums,
                    floors: form.residential_floors,
                    structure_map: structureMap,
                    rooms: form.rooms,
                    systems: form.systems,
                    has_refuge_area: form.hasRefugeArea,
                    refuge_floors: form.refugeFloors,
                    riser_count: form.riser_count,
                    extinguisher_pattern: form.extinguisher_pattern,
                    // Extended Data
                    pumps: form.pumps,
                    fire_alarm: form.fire_alarm,
                    extinguishers: form.extinguishers,
                    extinguisher_config: form.extinguisher_config,
                    hydrant_points_qty: form.hydrant_points_qty,
                    hose_reel_drum_qty: form.hose_reel_drum_qty
                }
            })

            if (error) throw error

            showToast('Client added successfully!', 'success')
            router.push('/inspections/new') // Or back to client list
        } catch (error: any) {
            console.error('Error adding client:', error)
            showToast(error.message || 'Failed to add client', 'error')
        } finally {
            setLoading(false)
        }
    }

    const toggleSystem = (system: string) => {
        setForm(prev => ({
            ...prev,
            systems: prev.systems.includes(system)
                ? prev.systems.filter(s => s !== system)
                : [...prev.systems, system]
        }))
    }

    const toggleRoom = (room: string) => {
        setForm(prev => ({
            ...prev,
            rooms: prev.rooms.includes(room)
                ? prev.rooms.filter(r => r !== room)
                : [...prev.rooms, room]
        }))
    }

    const addCustomRoom = () => {
        if (customRoom.trim() && !form.rooms.includes(customRoom)) {
            setForm(prev => ({ ...prev, rooms: [...prev.rooms, customRoom] }))
            setCustomRoom('')
        }
    }

    const addCustomSystem = () => {
        if (customSystem.trim() && !form.systems.includes(customSystem)) {
            setForm(prev => ({ ...prev, systems: [...prev.systems, customSystem] }))
            setCustomSystem('')
        }
    }

    if (verifying) return <FireEyeLoader fullscreen text="Verifying Access..." />

    if (!isAdmin) return null

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            <PageHeader
                title="Add New Client"
                subtitle="Define building structure and systems"
                backUrl="/dashboard"
            />

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                {/* 1. Basic Information */}
                <div className="liquid-card p-6 space-y-6 !overflow-visible relative z-20">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="bg-primary/10 p-2 rounded-lg text-primary"><Building className="h-5 w-5" /></span>
                        Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Client Name <span className="text-red-500">*</span></label>
                            <LiquidInput
                                required
                                placeholder="e.g. Lotus Heights Co-op Society"
                                value={form.name}
                                onChange={e => {
                                    setForm({ ...form, name: e.target.value })
                                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }))
                                }}
                                error={errors.name}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Full Address <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 z-10" />
                                <textarea
                                    required
                                    className={`liquid-input w-full !pl-12 ${errors.address ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                    placeholder="Start typing to search address..."
                                    rows={2}
                                    value={form.address}
                                    onChange={(e) => {
                                        setForm({ ...form, address: e.target.value })
                                        handleAddressSearch(e.target.value)
                                        if (errors.address) setErrors(prev => ({ ...prev, address: undefined }))
                                    }}
                                />
                                {errors.address && (
                                    <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in-down flex items-center gap-1.5 ml-1">
                                        <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                                        {errors.address}
                                    </p>
                                )}
                                {addressSuggestions.length > 0 && (
                                    <div className="absolute top-full mt-2 left-0 w-full z-50 animate-fade-in-down">
                                        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                                {addressSuggestions.map((suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => selectAddress(suggestion)}
                                                        className="w-full text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer flex items-center gap-3 transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 group"
                                                    >
                                                        <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-primary transition-colors" />
                                                        <span>
                                                            {suggestion.display_name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Phone Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <LiquidInput
                                    required
                                    type="tel"
                                    className="!pl-12"
                                    placeholder="+91 98765 43210"
                                    value={form.phone}
                                    onChange={e => {
                                        setForm({ ...form, phone: e.target.value })
                                        if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }))
                                    }}
                                    error={errors.phone}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Email Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <LiquidInput
                                    required
                                    type="email"
                                    className="!pl-12"
                                    placeholder="admin@society.com"
                                    value={form.email}
                                    onChange={e => {
                                        setForm({ ...form, email: e.target.value })
                                        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                                    }}
                                    error={errors.email}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Client Type */}
                <div className="liquid-card p-6 space-y-6">
                    <h2 className="text-xl font-bold">Client Type</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, type: 'Society/Residential' })}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.type === 'Society/Residential'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-transparent bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <Building className="h-8 w-8" />
                            <span className="font-bold">Society / Residential</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, type: 'Office/Store' })}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.type === 'Office/Store'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-transparent bg-white/5 hover:bg-white/10'
                                }`}
                        >
                            <Store className="h-8 w-8" />
                            <span className="font-bold">Office / Store</span>
                        </button>
                    </div>
                </div>

                {/* 3. Building Structure (Society Only) */}
                {form.type === 'Society/Residential' && (
                    <div className="liquid-card p-6 space-y-6 animate-fade-in">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Structure Configuration
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Basement Floors</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="liquid-input w-full"
                                    value={form.basements === 0 ? '' : form.basements}
                                    onChange={e => setForm({ ...form, basements: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Generates: B1, B2...</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Podium Floors</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="liquid-input w-full"
                                    value={form.podiums === 0 ? '' : form.podiums}
                                    onChange={e => setForm({ ...form, podiums: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Generates: P1, P2...</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-primary">Residential Floors</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 20"
                                    className="liquid-input w-full border-primary/30"
                                    value={form.residential_floors === 0 ? '' : form.residential_floors}
                                    onChange={e => setForm({ ...form, residential_floors: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Numbering continues after Podiums (e.g., P3 to Floor 4)</p>
                            </div>
                        </div>

                        {/* Refuge Area Configuration */}
                        <div className="pt-6 border-t border-gray-100 dark:border-white/10">
                            <label className="block text-sm font-medium mb-4">Is there a Refuge Area?</label>
                            <div className="flex gap-6 mb-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${form.hasRefugeArea ? 'border-primary bg-primary/10' : 'border-gray-400 group-hover:border-white/50'}`}>
                                        {form.hasRefugeArea && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                    </div>
                                    <span className="font-medium">Yes</span>
                                    <input
                                        type="radio"
                                        name="hasRefugeArea"
                                        className="hidden"
                                        checked={form.hasRefugeArea}
                                        onChange={() => setForm({ ...form, hasRefugeArea: true })}
                                    />
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${!form.hasRefugeArea ? 'border-primary bg-primary/10' : 'border-gray-400 group-hover:border-white/50'}`}>
                                        {!form.hasRefugeArea && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                    </div>
                                    <span className="font-medium">No</span>
                                    <input
                                        type="radio"
                                        name="hasRefugeArea"
                                        className="hidden"
                                        checked={!form.hasRefugeArea}
                                        onChange={() => setForm({ ...form, hasRefugeArea: false, refugeFloors: [] })}
                                    />
                                </label>
                            </div>

                            {form.hasRefugeArea && (
                                <div className="space-y-2 animate-fade-in-down">
                                    <label className="block text-sm font-medium mb-2 text-primary">Select Refuge Floor(s)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2">
                                        {calculateStructure().filter(f => !f.startsWith('B') && f !== 'Ground' && !f.startsWith('P')).map((floor) => (
                                            <div
                                                key={floor}
                                                onClick={() => {
                                                    if (form.refugeFloors.includes(floor)) {
                                                        setForm({ ...form, refugeFloors: form.refugeFloors.filter(f => f !== floor) })
                                                    } else {
                                                        setForm({ ...form, refugeFloors: [...form.refugeFloors, floor] })
                                                    }
                                                }}
                                                className={`
                                                    p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-sm
                                                    ${form.refugeFloors.includes(floor)
                                                        ? 'bg-primary/10 border-primary text-primary font-bold'
                                                        : 'bg-white/5 border-transparent hover:bg-white/10'
                                                    }
                                                `}
                                            >
                                                <span>{floor}</span>
                                                {form.refugeFloors.includes(floor) && <Check className="h-4 w-4" />}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500">Refuge areas are typically on upper residential floors (e.g. 7th, 14th...). Basements and Podiums excluded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Fire Safety Configuration (Common) */}
                <div className="liquid-card p-6 space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        Fire Safety Configuration
                    </h2>
                    
                    {form.type === 'Society/Residential' && (
                        <>
                            {/* Controls Row - More Compact */}
                            <div className="flex flex-col md:flex-row gap-6 md:items-start mb-6">
                                {/* Riser Count */}
                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col items-center min-w-[140px]">
                                    <label className="text-xs font-bold uppercase text-gray-400 mb-2">Total Risers</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, riser_count: Math.max(1, f.riser_count - 1) }))}
                                            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-8 text-center text-lg font-bold">{form.riser_count}</span>
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, riser_count: f.riser_count + 1 }))}
                                            className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:opacity-90 transition-opacity"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Extinguisher Pattern */}
                                <div className="flex-1 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                    <label className="text-xs font-bold uppercase text-gray-400 mb-3 block">Extinguisher Locations</label>
                                    <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                                        {(['Lobby Only', 'Staircase Only', 'Both'] as const).map(pattern => (
                                            <button
                                                key={pattern}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, extinguisher_pattern: pattern }))}
                                                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${form.extinguisher_pattern === pattern
                                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                    }`}
                                            >
                                                {pattern}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Detailed Extinguisher Configuration Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {(['Lobby', 'Staircase'] as const).map(location => {
                                    if (form.extinguisher_pattern === 'Staircase Only' && location === 'Lobby') return null
                                    if (form.extinguisher_pattern === 'Lobby Only' && location === 'Staircase') return null
                                    
                                    const items = form.extinguisher_config[location] || []
                                    const isActive = items.length > 0
                                    
                                    return (
                                        <div key={location} className={`p-4 rounded-xl border transition-colors ${
                                            isActive 
                                                ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10' 
                                                : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'
                                        }`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-black dark:bg-white' : 'bg-gray-300'}`} />
                                                    <h5 className="font-bold text-sm text-gray-700 dark:text-gray-200">{location} Config</h5>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateExtinguisherConfig(location, [...items, { id: crypto.randomUUID(), type: 'ABC', count: 1 }])}
                                                    className="w-6 h-6 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 transition-all shadow-sm border border-gray-200 dark:border-white/10"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {items.map((item, idx) => (
                                                    <div key={item.id} className="flex gap-2 items-center bg-white dark:bg-black/40 p-1.5 rounded-lg border border-gray-200 dark:border-white/10 group">
                                                        <div className="relative flex-1 min-w-[120px]">
                                                            <select
                                                                className="w-full bg-transparent text-xs font-semibold text-gray-700 dark:text-gray-200 appearance-none py-1 pl-2 pr-6 focus:outline-none"
                                                                value={item.type}
                                                                onChange={e => {
                                                                    const newItems = [...items]
                                                                    newItems[idx].type = e.target.value as ExtinguisherType
                                                                    updateExtinguisherConfig(location, newItems)
                                                                }}
                                                            >
                                                                {EXTINGUISHER_TYPES.map(t => (
                                                                    <option key={t} value={t} className="bg-white dark:bg-gray-900">{t}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                                        </div>

                                                        <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                                                        
                                                        <div className="flex items-center gap-1 min-w-[60px]">
                                                            <span className="text-[10px] uppercase font-bold text-gray-400 pl-1">Qty</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                className="w-full text-center bg-transparent text-sm font-bold p-0 focus:outline-none"
                                                                value={item.count === 0 ? '' : item.count}
                                                                onChange={e => {
                                                                    const newItems = [...items]
                                                                    newItems[idx].count = parseInt(e.target.value) || 0
                                                                    updateExtinguisherConfig(location, newItems)
                                                                }}
                                                            />
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => updateExtinguisherConfig(location, items.filter((_, i) => i !== idx))}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {items.length === 0 && (
                                                    <div className="py-4 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-lg">
                                                        <p className="text-xs text-gray-400">No extinguishers</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {/* Admin Extended Configuration */}
                    {isAdmin && (
                        <div className="space-y-6 animate-fade-in pt-6 border-t border-gray-100 dark:border-white/10">
                            <InventoryConfiguration
                                extinguishers={form.extinguishers}
                                fireAlarm={form.fire_alarm}
                                hydrantQty={form.hydrant_points_qty}
                                hoseReelQty={form.hose_reel_drum_qty}
                                onChangeExtinguishers={rows => setForm({ ...form, extinguishers: rows })}
                                onChangeFireAlarm={cfg => setForm({ ...form, fire_alarm: cfg })}
                                onChangeHydrant={q => setForm({ ...form, hydrant_points_qty: q })}
                                onChangeHoseReel={q => setForm({ ...form, hose_reel_drum_qty: q })}
                            />
                            <PumpConfiguration
                                pumps={form.pumps}
                                onChange={p => setForm({ ...form, pumps: p })}
                            />
                        </div>
                    )}

                    {/* Preview */}
                    {form.type === 'Society/Residential' && (
                        <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Structure Preview</h4>
                            <div className="flex flex-wrap gap-2">
                                {calculateStructure().map((floor, i) => (
                                    <span key={i} className={`
                                        px-2 py-1 rounded-md text-xs font-mono border 
                                        ${form.refugeFloors.includes(floor)
                                            ? 'bg-green-500/20 text-green-600 border-green-500/50 font-bold'
                                            : 'bg-white dark:bg-black border-gray-200 dark:border-white/10'
                                        }
                                    `}>
                                        {floor} {form.refugeFloors.includes(floor) && '(Refuge)'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>


                {/* 4. Rooms & Infrastructure */}
                <div className="liquid-card p-6 space-y-6">
                    <h2 className="text-xl font-bold">Rooms & Infrastructure</h2>
                    <div className="space-y-4">
                        <label className="block text-sm font-medium">Standard Rooms (Auto-added)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Standard Rooms */}
                            {DEFAULT_ROOMS.map(room => (
                                <div
                                    key={room}
                                    onClick={() => toggleRoom(room)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${form.rooms.includes(room)
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-white/5 border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    <span className="font-medium">{room}</span>
                                    {form.rooms.includes(room) && <Check className="h-5 w-5" />}
                                </div>
                            ))}
                            {/* Custom Rooms */}
                            {form.rooms.filter(r => !DEFAULT_ROOMS.includes(r)).map((room) => (
                                <div
                                    key={room}
                                    className="p-4 rounded-xl border border-primary/50 bg-primary/5 text-primary flex items-center justify-between group"
                                >
                                    <span className="font-medium">{room}</span>
                                    <div className="flex items-center gap-2">
                                        <Check className="h-5 w-5" />
                                        <button
                                            type="button"
                                            onClick={() => toggleRoom(room)}
                                            className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="liquid-input flex-1"
                                placeholder="Add custom room (e.g. Gym, Club House)..."
                                value={customRoom}
                                onChange={e => setCustomRoom(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomRoom())}
                            />
                            <button
                                type="button"
                                onClick={addCustomRoom}
                                className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. Systems */}
                <div className="liquid-card p-6 space-y-6">
                    <h2 className="text-xl font-bold">Fire Safety Systems</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {OPTIONAL_SYSTEMS.map(system => (
                            <div
                                key={system}
                                onClick={() => toggleSystem(system)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${form.systems.includes(system)
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-white/5 border-transparent hover:bg-white/10'
                                    }`}
                            >
                                <span className="font-medium">{system}</span>
                                {form.systems.includes(system) && <Check className="h-5 w-5" />}
                            </div>
                        ))}
                        {/* Custom Systems */}
                        {form.systems.filter(s => !OPTIONAL_SYSTEMS.includes(s)).map((system) => (
                            <div
                                key={system}
                                className="p-4 rounded-xl border border-primary/50 bg-primary/5 text-primary flex items-center justify-between group"
                            >
                                <span className="font-medium">{system}</span>
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5" />
                                    <button
                                        type="button"
                                        onClick={() => toggleSystem(system)}
                                        className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <input
                            type="text"
                            className="liquid-input flex-1"
                            placeholder="Add custom system..."
                            value={customSystem}
                            onChange={e => setCustomSystem(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSystem())}
                        />
                        <button
                            type="button"
                            onClick={addCustomSystem}
                            className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* 6. Initial Inspection Schedule */}
                <div className="liquid-card p-6 space-y-6 overflow-visible relative z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Initial Inspection Schedule
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <DateInput
                                label="First Inspection Date (Optional)"
                                value={form.next_inspection_date}
                                onChange={(date) => setForm({ ...form, next_inspection_date: date ? date.toISOString() : '' })}
                                placeholder="Select initial inspection date"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Set this to schedule the first inspection. Automated reminders will start based on this date.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="liquid-button bg-primary text-white hover:bg-primary/90 px-8 py-3 text-lg flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                        Save Client
                    </button>
                </div>
            </form>
        </div>
    )
}
