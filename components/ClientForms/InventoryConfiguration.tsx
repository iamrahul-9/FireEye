import { Bell, ChevronDown, Droplets } from 'lucide-react'
import { FireAlarmConfig, SprinklerConfig } from './types'
import { LiquidInput } from '@/components/Liquid'

interface InventoryConfigurationProps {
    fireAlarm: FireAlarmConfig
    hydrantQty: number
    hoseReelQty: number
    sprinklerQty: number
    sprinklerConfig: SprinklerConfig
    onChangeFireAlarm: (config: FireAlarmConfig) => void
    onChangeHydrant: (qty: number) => void
    onChangeHoseReel: (qty: number) => void

    onChangeSprinklerQty: (qty: number) => void
    onChangeSprinklerConfig: (config: SprinklerConfig) => void
    clientType?: 'Office/Store' | 'Society/Residential'
}

export default function InventoryConfiguration({
    fireAlarm,
    hydrantQty,
    hoseReelQty,
    sprinklerQty,
    sprinklerConfig,
    onChangeFireAlarm,
    onChangeHydrant,
    onChangeHoseReel,

    onChangeSprinklerQty,
    onChangeSprinklerConfig,
    clientType
}: InventoryConfigurationProps) {

    return (
        <div className="space-y-8">
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

            {/* Water Based Systems */}
            <div className="liquid-card p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                     <span className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                        <Droplets className="h-5 w-5" />
                    </span>
                    Water Based Fire Fighting Systems
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Hydrant - Hidden for Office/Store */}
                    {clientType !== 'Office/Store' && (
                        <div>
                            <label className="text-sm font-bold mb-2 block">Hydrant Valves</label>
                            <LiquidInput
                                type="number"
                                min="0"
                                placeholder="0"
                                value={hydrantQty === 0 ? '' : hydrantQty}
                                onChange={e => onChangeHydrant(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-gray-400 mt-1">Total count</p>
                        </div>
                    )}

                    {/* Hose Reel - Hidden for Office/Store */}
                    {clientType !== 'Office/Store' && (
                        <div>
                            <label className="text-sm font-bold mb-2 block">Hose Reel Drums</label>
                            <LiquidInput
                                type="number"
                                min="0"
                                placeholder="0"
                                value={hoseReelQty === 0 ? '' : hoseReelQty}
                                onChange={e => onChangeHoseReel(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-gray-400 mt-1">Total count</p>
                        </div>
                    )}

                    {/* Sprinklers */}
                    <div>
                        <label className="text-sm font-bold mb-2 block">Sprinklers</label>
                        <LiquidInput
                            type="number"
                            min="0"
                            placeholder="0"
                            value={sprinklerQty === 0 ? '' : sprinklerQty}
                            onChange={e => onChangeSprinklerQty(parseInt(e.target.value) || 0)}
                        />
                         <p className="text-xs text-gray-400 mt-1">Total count</p>
                    </div>

                    {/* Sprinkler Config Row */}
                    <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-white/5">
                        {/* Alignment */}
                        <div>
                            <label className="text-sm font-bold mb-2 block">Sprinkler Alignment</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:border-primary transition-colors"
                                    value={sprinklerConfig?.alignment || 'Pendent'}
                                    onChange={e => onChangeSprinklerConfig({ ...sprinklerConfig, alignment: e.target.value as any })}
                                >
                                    <option value="Pendent">Pendent</option>
                                    <option value="Upright">Upright</option>
                                    <option value="Side wall">Side wall</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Temperature */}
                        <div>
                            <label className="text-sm font-bold mb-2 block">Temperature Rating</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <select
                                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:border-primary transition-colors"
                                        value={['68', '93'].includes(sprinklerConfig?.temperature) ? sprinklerConfig.temperature : 'Other'}
                                        onChange={e => {
                                            const val = e.target.value
                                            if (val === 'Other') {
                                                onChangeSprinklerConfig({ ...sprinklerConfig, temperature: '' })
                                            } else {
                                                onChangeSprinklerConfig({ ...sprinklerConfig, temperature: val })
                                            }
                                        }}
                                    >
                                        <option value="68">68°C</option>
                                        <option value="93">93°C</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                                {!['68', '93'].includes(sprinklerConfig?.temperature) && (
                                    <div className="flex-1 animate-fade-in-left">
                                        <LiquidInput
                                            value={sprinklerConfig?.temperature}
                                            onChange={e => onChangeSprinklerConfig({ ...sprinklerConfig, temperature: e.target.value })}
                                            placeholder="Enter Temp"
                                            className="h-[42px]"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
