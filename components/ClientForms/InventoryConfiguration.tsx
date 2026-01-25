import { Plus, Trash2, Box, Flame, Bell } from 'lucide-react'
import { ExtinguisherRow, FireAlarmConfig } from './types'
import { LiquidInput } from '@/components/Liquid'

interface InventoryConfigurationProps {
    extinguishers: ExtinguisherRow[]
    fireAlarm: FireAlarmConfig
    hydrantQty: number
    hoseReelQty: number
    onChangeExtinguishers: (rows: ExtinguisherRow[]) => void
    onChangeFireAlarm: (config: FireAlarmConfig) => void
    onChangeHydrant: (qty: number) => void
    onChangeHoseReel: (qty: number) => void
}

export default function InventoryConfiguration({
    extinguishers,
    fireAlarm,
    hydrantQty,
    hoseReelQty,
    onChangeExtinguishers,
    onChangeFireAlarm,
    onChangeHydrant,
    onChangeHoseReel
}: InventoryConfigurationProps) {

    const addExtinguisherRow = () => {
        onChangeExtinguishers([
            ...extinguishers,
            { id: crypto.randomUUID(), type: '', capacity: '', quantity: 0 }
        ])
    }

    const updateExtinguisher = (id: string, updates: Partial<ExtinguisherRow>) => {
        onChangeExtinguishers(extinguishers.map(e => e.id === id ? { ...e, ...updates } : e))
    }

    const removeExtinguisher = (id: string) => {
        onChangeExtinguishers(extinguishers.filter(e => e.id !== id))
    }

    return (
        <div className="space-y-8">
            {/* Fire Extinguishers */}
            <div className="liquid-card p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-red-500/10 p-2 rounded-lg text-red-500">
                        <Flame className="h-5 w-5" />
                    </span>
                    Fire Extinguisher Inventory
                </h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-white/10 text-xs uppercase text-gray-400">
                                <th className="p-3">Type</th>
                                <th className="p-3">Capacity</th>
                                <th className="p-3 w-32">Quantity</th>
                                <th className="p-3 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {extinguishers.map((row) => (
                                <tr key={row.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-2">
                                        <LiquidInput
                                            value={row.type}
                                            onChange={e => updateExtinguisher(row.id, { type: e.target.value })}
                                            placeholder="e.g. ABC"
                                            className="h-10 text-sm"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <LiquidInput
                                            value={row.capacity}
                                            onChange={e => updateExtinguisher(row.id, { capacity: e.target.value })}
                                            placeholder="e.g. 4 KG"
                                            className="h-10 text-sm"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <LiquidInput
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={row.quantity === 0 ? '' : row.quantity}
                                            onChange={e => updateExtinguisher(row.id, { quantity: parseInt(e.target.value) || 0 })}
                                            className="h-10 text-sm font-bold text-center"
                                        />
                                    </td>
                                    <td className="p-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => removeExtinguisher(row.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={addExtinguisherRow}
                    className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                    <Plus className="h-4 w-4" /> Add Item
                </button>
            </div>

            {/* Fire Alarm System */}
            <div className="liquid-card p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
                        <Bell className="h-5 w-5" />
                    </span>
                    Fire Alarm System
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Panels</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={fireAlarm.panel_qty === 0 ? '' : fireAlarm.panel_qty}
                            onChange={e => onChangeFireAlarm({ ...fireAlarm, panel_qty: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Smoke Det.</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={fireAlarm.smoke_detector_qty === 0 ? '' : fireAlarm.smoke_detector_qty}
                            onChange={e => onChangeFireAlarm({ ...fireAlarm, smoke_detector_qty: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Heat Det.</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={fireAlarm.heat_detector_qty === 0 ? '' : fireAlarm.heat_detector_qty}
                            onChange={e => onChangeFireAlarm({ ...fireAlarm, heat_detector_qty: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">MCPs</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={fireAlarm.mcp_qty === 0 ? '' : fireAlarm.mcp_qty}
                            onChange={e => onChangeFireAlarm({ ...fireAlarm, mcp_qty: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                     <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Hooters</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={fireAlarm.hooter_qty === 0 ? '' : fireAlarm.hooter_qty}
                            onChange={e => onChangeFireAlarm({ ...fireAlarm, hooter_qty: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </div>

            {/* Other System Quantities */}
            <div className="liquid-card p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                     <span className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                        <Box className="h-5 w-5" />
                    </span>
                    Other Assets
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-bold mb-2 block">Total Hydrant Valves</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={hydrantQty === 0 ? '' : hydrantQty}
                            onChange={e => onChangeHydrant(parseInt(e.target.value) || 0)}
                        />
                         <p className="text-xs text-gray-400 mt-1">Total count of Hydrant points across all floors/risers</p>
                    </div>
                    <div>
                        <label className="text-sm font-bold mb-2 block">Total Hose Reel Drums</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={hoseReelQty === 0 ? '' : hoseReelQty}
                            onChange={e => onChangeHoseReel(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
