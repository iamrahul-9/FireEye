import { LiquidCard } from '@/components/Liquid'
import { Pump, FireAlarmConfig, ExtinguisherRow, SprinklerConfig, ExtinguisherLocationConfig } from '@/components/ClientForms/types'
import { Activity, Bell, Droplets, Flame, ShowerHead } from 'lucide-react'

interface AdminClientDashboardProps {
    clientType: string
    structure: {
        basements?: number
        podiums?: number
        floors?: number // residential_floors
        pumps?: Pump[]
        fire_alarm?: FireAlarmConfig
        extinguishers?: ExtinguisherRow[] // Legacy support
        extinguisher_config?: ExtinguisherLocationConfig
        extinguisher_pattern?: string
        hydrant_points_qty?: number
        hose_reel_drum_qty?: number
        sprinkler_qty?: number
        sprinkler_config?: SprinklerConfig
    }
}

export default function AdminClientDashboard({ structure, clientType }: AdminClientDashboardProps) {
    // Safety check for empty data
    if (!structure) return null

    const hasExtendedData = structure.pumps?.length || structure.fire_alarm || structure.extinguishers?.length

    if (!hasExtendedData) {
        return (
            <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-center text-gray-500 text-sm">
                No detailed inventory data available for this client.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Activity className="h-5 w-5" />
                </span>
                Inventory & Configuration (Admin View)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Pump Configuration */}
                <LiquidCard className="p-6 space-y-4">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-primary" />
                        Pump Status
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-bold text-gray-400 border-b border-gray-100 dark:border-white/5">
                                    <th className="pb-2">Pump Name</th>
                                    <th className="pb-2">Type</th>
                                    <th className="pb-2 text-right">Capacity (HP)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {structure.pumps?.map(pump => (
                                    <tr key={pump.id}>
                                        <td className="py-2 font-medium">{pump.name}</td>
                                        <td className="py-2 text-gray-500">{pump.type}</td>
                                        <td className="py-2 text-right">{pump.hp} HP</td>
                                    </tr>
                                )) || (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-gray-400 italic">No pumps configured</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </LiquidCard>

                {/* 2. Fire Alarm System */}
                <LiquidCard className="p-6 space-y-4">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Fire Alarm System
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Panels</p>
                            <p className="text-xl font-bold">{structure.fire_alarm?.panel_qty || 0}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">MCPs</p>
                            <p className="text-xl font-bold">{structure.fire_alarm?.mcp_qty || 0}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Smoke Detectors</p>
                            <p className="text-xl font-bold">{structure.fire_alarm?.smoke_detector_qty || 0}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Hooters</p>
                            <p className="text-xl font-bold">{structure.fire_alarm?.hooter_qty || 0}</p>
                        </div>
                    </div>
                </LiquidCard>

                {/* 3. Hydrant & Sprinkler */}
                <LiquidCard className="p-6 space-y-4">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-primary" />
                        Hydrant System
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-white/10 rounded-xl">
                            <span className="font-medium">Hydrant Points</span>
                            <span className="text-lg font-bold text-primary">{structure.hydrant_points_qty || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-white/10 rounded-xl">
                            <span className="font-medium">Hose Reel Drums</span>
                            <span className="text-lg font-bold text-primary">{structure.hose_reel_drum_qty || 0}</span>
                        </div>
                    </div>
                </LiquidCard>

                {/* 4. Sprinkler System */}
                <LiquidCard className="p-6 space-y-4">
                     <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <ShowerHead className="h-4 w-4 text-primary" />
                        Sprinkler System
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-white/10 rounded-xl">
                            <span className="font-medium">Total Sprinklers</span>
                            <span className="text-lg font-bold text-primary">{structure.sprinkler_qty || 0}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Alignment</p>
                                <p className="font-bold text-sm">{structure.sprinkler_config?.alignment || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Temperature</p>
                                <p className="font-bold text-sm">{structure.sprinkler_config?.temperature ? `${structure.sprinkler_config.temperature}°C` : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </LiquidCard>

                {/* 4. Extinguisher Inventory */}
                <LiquidCard className="p-6 space-y-4 md:col-span-2">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2 flex items-center gap-2">
                        <Flame className="h-4 w-4 text-primary" />
                        Extinguisher Inventory (Calculated)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-bold text-gray-400 border-b border-gray-100 dark:border-white/5">
                                    <th className="pb-2">Type</th>
                                    <th className="pb-2">Capacity</th>
                                    <th className="pb-2 text-right">Total Quantity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {(() => {
                                    // Calculation Logic
                                    const isSociety = clientType === 'Society/Residential'
                                    const totalFloors = isSociety 
                                        ? (structure.basements || 0) + (structure.floors || 0) + 2 // Basements + Floors + Ground + Terrace
                                        : 1

                                    // Aggregate counts per type
                                    const typeCounts: Record<string, number> = {}
                                    const config = structure.extinguisher_config || {}
                                    
                                    Object.keys(config).forEach(location => {
                                        // Filter based on pattern if needed, but usually config contains what's active
                                        // Just sum everything in the config
                                        const items = config[location]
                                        items.forEach(item => {
                                             // If "Staircase", multiply by floors?
                                             // The config was set up as "Per Floor" count usually?
                                             // In NewClientPage logic: const totalQty = item.count * totalFloors
                                             // Yes, we assume item.count is PER LEVEL.
                                             // So we multiply by totalFloors.
                                             
                                             /* 
                                                WAIT: Is 'Lobby' per floor? Yes.
                                                Is 'Staircase' per floor? Yes.
                                                Is 'Electrical Room' per floor? No, usually specific.
                                                
                                                The current `extinguisher_config` in NewClientPage is keyed by 'Lobby' / 'Staircase'.
                                                It assumes these are vertical distributions.
                                                If we add other locations later, we might need a flag.
                                                For now, existing logic was `totalQty = item.count * totalFloors`.
                                                We'll stick to that.
                                             */
                                            const qty = item.count * totalFloors
                                            typeCounts[item.type] = (typeCounts[item.type] || 0) + qty
                                        })
                                    })

                                    // Convert to rows
                                    const rows = Object.entries(typeCounts).map(([type, qty]) => ({
                                        type,
                                        capacity: type.includes('CO2') ? '2 KG' 
                                            : type.includes('Clean Agent') ? '4 Liter' 
                                            : '4 KG',
                                        quantity: qty
                                    })).sort((a, b) => b.quantity - a.quantity)

                                    // Fallback to legacy extinguishers array if config is empty but array exists
                                    if (rows.length === 0 && structure.extinguishers?.length) {
                                        return structure.extinguishers.map((ext, i) => (
                                            <tr key={i}>
                                                <td className="py-2 font-medium">{ext.type}</td>
                                                <td className="py-2 text-gray-500">{ext.capacity}</td>
                                                <td className="py-2 text-right font-bold">{ext.quantity}</td>
                                            </tr>
                                        ))
                                    }

                                    if (rows.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={3} className="py-4 text-center text-gray-400 italic">No extinguishers configured</td>
                                            </tr>
                                        )
                                    }

                                    return rows.map((ext, i) => (
                                        <tr key={i}>
                                            <td className="py-2 font-medium">{ext.type || 'Other'}</td>
                                            <td className="py-2 text-gray-500">{ext.capacity}</td>
                                            <td className="py-2 text-right font-bold">{ext.quantity}</td>
                                        </tr>
                                    ))
                                })()}
                            </tbody>
                        </table>
                    </div>
                </LiquidCard>
            </div>
        </div>
    )
}
