
export type ExtinguisherType = 'ABC' | 'CO2' | 'Clean Agent' | 'ABC Modular' | 'Clean Agent Modular' | 'Other'

export interface ExtinguisherConfigItem {
    id: string
    type: ExtinguisherType
    count: number
}

export interface ExtinguisherLocationConfig {
    [location: string]: ExtinguisherConfigItem[] // e.g. "Lobby" -> [...]
}

export interface Pump {
    id: string
    name: string
    type: 'Monoblock' | 'Submersible' | 'Other'
    other_type?: string
    hp: number
}

export interface FireAlarmConfig {
    panel_qty: number
    smoke_detector_qty: number
    heat_detector_qty: number
    mcp_qty: number
    hooter_qty: number
}

export interface ExtinguisherRow {
    id: string
    type: string
    capacity: string
    quantity: number
}

export interface ClientFormExtended {
    // ... existing fields will be merged in page.tsx ...
    pumps: Pump[]
    fire_alarm: FireAlarmConfig
    extinguishers: ExtinguisherRow[] // The total inventory table
    extinguisher_config: ExtinguisherLocationConfig // The per-floor configuration
    hydrant_points_qty: number
    hose_reel_drum_qty: number
}
