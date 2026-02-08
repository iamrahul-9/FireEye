'use client'

import { Minus, Plus, AlertTriangle, Trash2, ChevronDown } from 'lucide-react'
import PhotoUpload from '@/components/PhotoUpload'

import { FloorData, ExtinguisherData, RiserData, InspectionData } from './DynamicInspectionForm'
import { EXTINGUISHER_TYPES, ExtinguisherLocationConfig } from './ClientForms/types'

interface FloorInspectionCardProps {
    floor: FloorData
    floorIdx: number
    data: InspectionData
    setData: (data: InspectionData) => void
    extinguisherConfig?: ExtinguisherLocationConfig
}

export default function FloorInspectionCard({ floor, floorIdx, data, setData, extinguisherConfig: _extinguisherConfig }: FloorInspectionCardProps) {


    const updateFloor = (updates: Partial<FloorData>) => {
        const newFloors = [...data.floors]
        newFloors[floorIdx] = { ...newFloors[floorIdx], ...updates }
        setData({ ...data, floors: newFloors })
    }

    const updateExtinguisher = (extIdx: number, updates: Partial<ExtinguisherData>) => {
        const newFloors = [...data.floors]
        newFloors[floorIdx].extinguishers[extIdx] = { 
            ...newFloors[floorIdx].extinguishers[extIdx], 
            ...updates 
        }
        setData({ ...data, floors: newFloors })
    }

    const updateRiser = (riserIdx: number, field: 'sprinkler' | 'hydrant_valve' | 'hose_reel', updates: any) => {
        const newFloors = [...data.floors]
        newFloors[floorIdx].risers[riserIdx][field] = {
            ...newFloors[floorIdx].risers[riserIdx][field],
            ...updates
        }
        setData({ ...data, floors: newFloors })
    }

    const handleImageAnalysis = (analysis: string, context: string) => {
        const prefix = `\n• Image Analysis (${context}): `
        const newNote = `${prefix}${analysis}`
        const currentNotes = floor.notes || ''
        // Avoid duplicate notes if analyzed twice
        if (currentNotes.includes(analysis)) return

        const updatedNotes = currentNotes ? `${currentNotes}${newNote}` : `• Manual Observation (${context})\n${newNote}`
        updateFloor({ notes: updatedNotes })
    }

    return (
        <div className="flex flex-col gap-6 bg-gray-50/50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">

            {/* 1. Fire Extinguishers Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <h4 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">Fire Extinguishers</h4>
                </div>
                
                {floor.extinguishers.map((ext, extIdx) => (
                    <div key={extIdx} className="bg-white dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase text-gray-500">{ext.location}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-start gap-4">
                            {/* Status */}
                            <div className="shrink-0">
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Status</label>
                                <select
                                    className="liquid-input text-xs py-2 h-10 min-w-[140px]"
                                    value={ext.status}
                                    onChange={e => updateExtinguisher(extIdx, { status: e.target.value as ExtinguisherData['status'] })}
                                >
                                    <option value="Okay">Okay</option>
                                    <option value="Pressure Low">Pressure Low</option>
                                    <option value="Expired">Expired</option>
                                    <option value="Not Available">Not Available</option>
                                </select>
                            </div>
                            
                            {/* Types - only show if not "Not Available" */}
                            {/* Types - only show if not "Not Available" */}
                            {ext.status !== 'Not Available' && (
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Types & Counts</label>
                                    <div className="space-y-3">
                                        {Object.entries(ext.types || {}).map(([type, count]) => (
                                            <div key={type} className="flex items-center gap-2 bg-gray-50 dark:bg-black/20 p-2 rounded-lg border border-gray-100 dark:border-white/10">
                                                <div className="flex-1 min-w-[100px]">
                                                    {EXTINGUISHER_TYPES.includes(type as any) && type !== 'Other' ? (
                                                        <div className="relative">
                                                            <select
                                                                className="w-full bg-transparent text-xs font-bold appearance-none py-1 pl-2 pr-6 focus:outline-none"
                                                                value={type}
                                                                onChange={e => {
                                                                    const newType = e.target.value
                                                                    if (newType === type) return
                                                                    const newTypes = { ...ext.types }
                                                                    const currentCount = newTypes[type] || 0
                                                                    delete newTypes[type]
                                                                    newTypes[newType] = (newTypes[newType] || 0) + currentCount
                                                                    updateExtinguisher(extIdx, { types: newTypes })
                                                                }}
                                                            >
                                                                {EXTINGUISHER_TYPES.map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                                {/* Custom types are rendered as inputs below, but if we have a custom type in the list, show it?
                                                                    Actually if it's not in EXTINGUISHER_TYPES, it renders the input block below.
                                                                */}
                                                            </select>
                                                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                                                        </div>
                                                    ) : (
                                                       <input
                                                            type="text"
                                                            className="w-full bg-transparent text-xs font-bold border-b border-primary/50 focus:outline-none"
                                                            value={type}
                                                            autoFocus
                                                            onChange={e => {
                                                                const newType = e.target.value
                                                                const newTypes = { ...ext.types }
                                                                const currentCount = newTypes[type] || 0
                                                                delete newTypes[type]
                                                                if (newType) newTypes[newType] = currentCount
                                                                updateExtinguisher(extIdx, { types: newTypes })
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Quantity */}
                                                <div className="flex items-center gap-1 bg-white dark:bg-white/10 rounded-lg p-0.5 border border-gray-200 dark:border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newTypes = { ...ext.types }
                                                            const current = newTypes[type] || 0
                                                            if (current > 1) {
                                                                newTypes[type] = current - 1
                                                                updateExtinguisher(extIdx, { types: newTypes })
                                                            }
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-6 text-center text-xs font-bold">{count}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newTypes = { ...ext.types }
                                                            newTypes[type] = (newTypes[type] || 0) + 1
                                                            updateExtinguisher(extIdx, { types: newTypes })
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>

                                                {/* Remove */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newTypes = { ...ext.types }
                                                        delete newTypes[type]
                                                        updateExtinguisher(extIdx, { types: newTypes })
                                                    }}
                                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newTypes = { ...ext.types }
                                                const nextType = EXTINGUISHER_TYPES.find(t => !newTypes[t]) || 'Other'
                                                if (newTypes[nextType]) {
                                                    newTypes['New Type'] = 1
                                                } else {
                                                    newTypes[nextType] = 1
                                                }
                                                updateExtinguisher(extIdx, { types: newTypes })
                                            }}
                                            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline px-1"
                                        >
                                            <Plus className="h-3 w-3" /> Add Extinguisher
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Photo if not Okay */}
                        {ext.status !== 'Okay' && ext.status !== 'Not Available' && (
                            <div className="mt-3">
                                <PhotoUpload
                                    required={true}
                                    currentUrl={ext.photo_url}
                                    onUpload={(url) => updateExtinguisher(extIdx, { photo_url: url })}
                                    onAnalyze={(text) => handleImageAnalysis(text, `Extinguisher at ${ext.location}`)}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 2. Fire Alarm MCP & Panel Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <h4 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">Fire Alarm MCP & Panel</h4>
                </div>
                
                <div className="bg-white dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                    <div className="flex flex-wrap items-start gap-4">
                        {/* Status */}
                        <div className="shrink-0">
                            <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Status</label>
                            <div className="flex gap-2">
                                {(['Okay', 'Not Okay'] as const).map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => updateFloor({ fire_alarm: { ...floor.fire_alarm, status } })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                            floor.fire_alarm.status === status
                                                ? status === 'Okay' 
                                                    ? 'bg-green-500 text-white border-green-500'
                                                    : 'bg-red-500 text-white border-red-500'
                                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                    </div>
                    
                    {/* Photo if Not Okay */}
                    {floor.fire_alarm.status === 'Not Okay' && (
                        <div className="mt-3">
                            <PhotoUpload
                                required={true}
                                currentUrl={floor.fire_alarm.photo_url}
                                onUpload={(url) => updateFloor({ fire_alarm: { ...floor.fire_alarm, photo_url: url } })}
                                onAnalyze={(text) => handleImageAnalysis(text, 'Fire Alarm System')}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Risers Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h4 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
                        {floor.risers.length === 1 ? 'Riser Status' : 'Risers'}
                    </h4>
                </div>
                
                {floor.risers.map((riser, riserIdx) => (
                    <div key={riserIdx} className="bg-white dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                        {floor.risers.length > 1 && (
                            <div className="mb-3">
                                <span className="text-xs font-bold uppercase text-gray-500">Riser {riserIdx + 1}</span>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Sprinkler */}
                             {(riser.sprinkler.status as string) !== 'Not Available' && (
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Sprinkler</label>
                                <select
                                    className="liquid-input w-full text-xs py-2"
                                    value={riser.sprinkler.status}
                                    onChange={e => updateRiser(riserIdx, 'sprinkler', { status: e.target.value as RiserData['sprinkler']['status'] })}
                                >
                                    <option value="Okay">Okay</option>
                                    <option value="Okay">Okay</option>
                                    <option value="Butterfly Valve Shutoff">Butterfly Valve Shutoff</option>
                                    <option value="Pressure Low">Pressure Low</option>
                                    <option value="Fire Duct Obstructed">Fire Duct Obstructed</option>
                                    <option value="Line Not Charge">Line Not Charge</option>
                                    <option value="Broken Sprinkler">Broken Sprinkler</option>
                                    <option value="Not Available">Not Available</option>
                                </select>
                                {riser.sprinkler.status !== 'Okay' && (
                                    <div className="mt-2">
                                        <PhotoUpload
                                            required={true}
                                            currentUrl={riser.sprinkler.photo_url}
                                            onUpload={(url) => updateRiser(riserIdx, 'sprinkler', { photo_url: url })}
                                            onAnalyze={(text) => handleImageAnalysis(text, `Riser ${riserIdx + 1} Sprinkler`)}
                                        />
                                    </div>
                                )}
                            </div>
                             )}
                            
                            {/* Hydrant Valve */}
                            {(riser.hydrant_valve.status as string) !== 'Not Available' && (
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Hydrant Valve</label>
                                <select
                                    className="liquid-input w-full text-xs py-2"
                                    value={riser.hydrant_valve.status}
                                    onChange={e => updateRiser(riserIdx, 'hydrant_valve', { status: e.target.value as RiserData['hydrant_valve']['status'] })}
                                >
                                    <option value="Okay">Okay</option>
                                    <option value="Leaking">Leaking</option>
                                    <option value="Jammed">Jammed</option>
                                    <option value="Lugs / Wheel Missing">Lugs / Wheel Missing</option>
                                    <option value="Line Not Charge">Line Not Charge</option>
                                    <option value="Not Available">Not Available</option>
                                </select>
                                {riser.hydrant_valve.status !== 'Okay' && riser.hydrant_valve.status !== 'Not Available' && (
                                    <div className="mt-2">
                                        <PhotoUpload
                                            required={true}
                                            currentUrl={riser.hydrant_valve.photo_url}
                                            onUpload={(url) => updateRiser(riserIdx, 'hydrant_valve', { photo_url: url })}
                                            onAnalyze={(text) => handleImageAnalysis(text, `Riser ${riserIdx + 1} Hydrant`)}
                                        />
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Hose Reel Drum */}
                            {(riser.hose_reel.status as string) !== 'Not Available' && (
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Hose Reel Drum</label>
                                <select
                                    className="liquid-input w-full text-xs py-2"
                                    value={riser.hose_reel.status}
                                    onChange={e => updateRiser(riserIdx, 'hose_reel', { status: e.target.value as RiserData['hose_reel']['status'] })}
                                >
                                    <option value="Okay">Okay</option>
                                    <option value="Leaking">Leaking</option>
                                    <option value="Jammed / Stuck">Jammed / Stuck</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Missing">Missing</option>
                                    <option value="Not Available">Not Available</option>
                                </select>
                                {riser.hose_reel.status !== 'Okay' && riser.hose_reel.status !== 'Not Available' && (
                                    <div className="mt-2">
                                        <PhotoUpload
                                            required={true}
                                            currentUrl={riser.hose_reel.photo_url}
                                            onUpload={(url) => updateRiser(riserIdx, 'hose_reel', { photo_url: url })}
                                            onAnalyze={(text) => handleImageAnalysis(text, `Riser ${riserIdx + 1} Hose Reel`)}
                                        />
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. Refuge Area (if applicable) */}
            {floor.refuge_area && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <h4 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">Refuge Area</h4>
                    </div>
                    
                    <div className="bg-white dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                        <div className="flex flex-wrap items-start gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Status</label>
                                <select
                                    className="liquid-input text-xs py-2 min-w-[180px]"
                                    value={floor.refuge_area.status}
                                    onChange={e => updateFloor({ refuge_area: { ...floor.refuge_area!, status: e.target.value as 'Empty' | 'Obstructed / Occupied' } })}
                                >
                                    <option value="Empty">Empty</option>
                                    <option value="Obstructed / Occupied">Obstructed / Occupied</option>
                                </select>
                            </div>
                        </div>
                        
                        {floor.refuge_area.status !== 'Empty' && (
                            <>
                                <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Critical Failure: Refuge Area must be accessible always.
                                </p>
                                <div className="mt-3">
                                    <PhotoUpload
                                        required={true}
                                        label="Proof of Obstruction"
                                        currentUrl={floor.refuge_area.photo_url}
                                        onUpload={(url) => updateFloor({ refuge_area: { ...floor.refuge_area!, photo_url: url } })}
                                        onAnalyze={(text) => handleImageAnalysis(text, 'Refuge Area')}
                                    />
                                </div>
                                </>
                            )}
                        </div>
                    </div>
            )}

            {/* 4. Floor Notes (AI-Assisted) */}
            {(() => {
                const hasIssues = 
                    floor.extinguishers.some(e => e.status !== 'Okay' && e.status !== 'Not Available') ||
                    floor.fire_alarm.status === 'Not Okay' ||
                    floor.risers.some(r => 
                        r.sprinkler.status !== 'Okay' || 
                        (r.hydrant_valve.status !== 'Okay' && r.hydrant_valve.status !== 'Not Available') ||
                        (r.hose_reel.status !== 'Okay' && r.hose_reel.status !== 'Not Available')
                    ) ||
                    floor.refuge_area?.status === 'Obstructed / Occupied'

                if (!hasIssues) return null

                return (
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                Additional Notes
                            </h4>
                        </div>
                        <textarea
                            className="liquid-input w-full text-sm p-3 min-h-[80px]"
                            placeholder="Add any specific observations for this floor..."
                            value={floor.notes || ''}
                            onChange={e => updateFloor({ notes: e.target.value })}
                        />
                    </div>
                )
            })()}

        </div>
    )
}
