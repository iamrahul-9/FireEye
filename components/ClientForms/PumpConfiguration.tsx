import { Plus, Trash2, Droplets } from 'lucide-react'
import { Pump } from './types'
import { LiquidInput } from '@/components/Liquid'

interface PumpConfigurationProps {
    pumps: Pump[]
    onChange: (pumps: Pump[]) => void
}

export default function PumpConfiguration({ pumps, onChange }: PumpConfigurationProps) {
    const addPump = () => {
        const newPump: Pump = {
            id: crypto.randomUUID(),
            name: '',
            type: 'Monoblock',
            hp: 0
        }
        onChange([...pumps, newPump])
    }

    const updatePump = (id: string, updates: Partial<Pump>) => {
        onChange(pumps.map(p => p.id === id ? { ...p, ...updates } : p))
    }

    const removePump = (id: string) => {
        onChange(pumps.filter(p => p.id !== id))
    }

    return (
        <div className="liquid-card p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <Droplets className="h-5 w-5" />
                </span>
                Pump Configuration
            </h2>
            
            <div className="space-y-4">
                {pumps.map((pump, idx) => (
                    <div key={pump.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                        {/* Pump Name */}
                        <div className="md:col-span-4">
                            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Pump Name</label>
                            <LiquidInput
                                value={pump.name}
                                onChange={e => updatePump(pump.id, { name: e.target.value })}
                                placeholder="e.g. Main Hydrant Pump"
                            />
                        </div>

                        {/* Pump Type */}
                        <div className="md:col-span-3">
                            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Type</label>
                            <select
                                className="liquid-input w-full"
                                value={pump.type}
                                onChange={e => {
                                    const val = e.target.value as any
                                    updatePump(pump.id, { type: val })
                                }}
                            >
                                <option value="Monoblock">Monoblock</option>
                                <option value="Submersible">Submersible</option>
                                <option value="Other">Other</option>
                            </select>
                            {pump.type === 'Other' && (
                                <div className="mt-2">
                                    <LiquidInput
                                        placeholder="Specify Type"
                                        value={pump.other_type || ''}
                                        onChange={e => updatePump(pump.id, { other_type: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* HP */}
                        <div className="md:col-span-3">
                            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Capacity (HP)</label>
                            <LiquidInput
                                type="number"
                                min="0" // Default 0 allowed, but should be >0 ideally
                                placeholder="0"
                                value={pump.hp === 0 ? '' : pump.hp}
                                onChange={e => updatePump(pump.id, { hp: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex justify-end pb-1">
                                <button
                                    type="button"
                                    onClick={() => removePump(pump.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remove Pump"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addPump}
                    className="w-full py-3 rounded-xl border border-dashed border-gray-300 dark:border-white/20 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium text-gray-500"
                >
                    <Plus className="h-5 w-5" />
                    Add Another Pump
                </button>
            </div>
        </div>
    )
}
