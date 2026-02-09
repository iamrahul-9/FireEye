
// import { ExtinguisherLocationConfig } from '@/components/ClientForms/types' (Removed/Unused)

export type ExtinguisherType = string

// Extinguisher data per location (Lobby or Staircase)
export type ExtinguisherData = {
    location: 'Lobby' | 'Staircase'
    status: 'Okay' | 'Pressure Low' | 'Expired' | 'Not Available'
    types: Partial<Record<ExtinguisherType, number>>
    photo_url?: string
}

// Riser data - each riser has sprinkler, hydrant valve, and hose reel
export type RiserData = {
    name: string
    sprinkler: {
        status: 'Okay' | 'Butterfly Valve Shutoff' | 'Pressure Low' | 'Fire Duct Obstructed' | 'Not Available'
        photo_url?: string
    }
    hydrant_valve: {
        status: 'Okay' | 'Leaking' | 'Jammed' | 'Lugs / Wheel Missing' | 'Not Available'
        photo_url?: string
    }
    hose_reel: {
        status: 'Okay' | 'Leaking' | 'Jammed / Stuck' | 'Damaged' | 'Missing' | 'Not Available'
        photo_url?: string
    }
}

export type FloorData = {
    name: string
    // Array of extinguishers - one per location (Lobby, Staircase, or Both)
    extinguishers: ExtinguisherData[]
    // Fire Alarm MCP & Panel
    fire_alarm: {
        status: 'Okay' | 'Not Okay'
        note?: string
        photo_url?: string
    }
    // Array of risers - each has sprinkler, hydrant valve, hose reel
    risers: RiserData[]
    // Refuge area (if applicable)
    refuge_area?: {
        status: 'Empty' | 'Obstructed / Occupied'
        photo_url?: string
    }
    notes?: string
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
    status: 'Auto (Working)' | 'Manual (Working)' | 'Not Working' | 'Does Not Exist'
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
