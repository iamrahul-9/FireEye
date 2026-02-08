import { InspectionData } from '@/components/DynamicInspectionForm'

export const generateInspectionSummary = (data: InspectionData): string => {
    const criticalIssues: string[] = []
    const observations: string[] = []
    let isCompliant = true

    // --- 1. ANALYZE FLOORS ---
    data.floors.forEach(floor => {
        // Critical: Extinguisher Expired or Low Pressure
        floor.extinguishers.forEach(ext => {
            if (ext.status === 'Expired' || ext.status === 'Pressure Low') {
                criticalIssues.push(`Fire extinguishers (${ext.location}) on ${floor.name} were found to be ${ext.status.toLowerCase()}.`)
                isCompliant = false
            }
        })
        // Critical: Hydrant Issues
        floor.risers.forEach(riser => {
            if (riser.hydrant_valve.status === 'Leaking' || riser.hydrant_valve.status === 'Jammed') {
                criticalIssues.push(`Hydrant valve (${riser.name}) on ${floor.name} is ${riser.hydrant_valve.status.toLowerCase()}.`)
                isCompliant = false
            }
            if (riser.hose_reel.status === 'Damaged' || riser.hose_reel.status === 'Missing') {
                criticalIssues.push(`Hose reel (${riser.name}) on ${floor.name} is ${riser.hose_reel.status.toLowerCase()}.`)
                isCompliant = false
            }
        })
        // Critical: Alarm Fault
        if (floor.fire_alarm?.status === 'Not Okay') {
            criticalIssues.push(`Fire alarm system on ${floor.name} reported as Not Okay.`)
            isCompliant = false
        }
        // Critical: Refuge Obstructed
        if (floor.refuge_area?.status === 'Obstructed / Occupied') {
            criticalIssues.push(`Refuge area on ${floor.name} is obstructed/occupied, posing a serious safety risk.`)
            isCompliant = false
        }
    })

    // --- 2. ANALYZE PUMPS ---
    data.pumps.forEach(pump => {
        if (pump.status === 'Not Working') {
            criticalIssues.push(`The ${pump.name} is currently not working and requires immediate repair.`)
            isCompliant = false
        }
    })

    // --- 3. ANALYZE SYSTEMS ---
    data.systems.forEach(sys => {
        if (sys.status === 'Not Operational') {
            criticalIssues.push(`The ${sys.name} is reported as Not Operational.`)
            isCompliant = false
        } else if (sys.status === 'Needs Attention') {
            observations.push(`The ${sys.name} requires maintenance attention.`)
        }
    })

    // --- 4. ANALYZE ROOMS ---
    data.rooms.forEach(room => {
        if (room.extinguisher.status === 'Missing') {
            criticalIssues.push(`Fire extinguisher missing in ${room.name}.`)
            isCompliant = false
        }
        if (room.housekeeping === 'Poor') {
            observations.push(`Housekeeping in ${room.name} needs improvement to reduce fire load.`)
        }
        if (room.accessibility === 'Obstructed') {
            observations.push(`Access to electrical panels/servers in ${room.name} is obstructed.`)
        }
    })

    // --- GENERATE NARRATIVE ---
    const parts: string[] = []

    // Part 1: Critical Issues
    if (criticalIssues.length > 0) {
        parts.push("During the inspection, the following critical fire safety deficiencies were observed:")
        criticalIssues.forEach(issue => parts.push(`• ${issue}`))
        parts.push("These issues pose a life safety risk and require immediate corrective action.")
        parts.push("\n")
    }

    // Part 2: Non-Critical Observations
    if (observations.length > 0) {
        parts.push("The following observations were also noted which require attention:")
        observations.forEach(obs => parts.push(`• ${obs}`))
        parts.push("\n")
    }

    // Part 3: Positive Statement (only if not completely broken)
    if (criticalIssues.length < 5) {
        parts.push("Other fire safety systems including available extinguishers, hydrants, and pumps were found to be in satisfactory working condition at the time of inspection.")
        parts.push("\n")
    }

    // Part 4: Conclusion
    if (isCompliant) {
        parts.push("FINAL CONCLUSION: COMPLIANT")
        parts.push("Based on the above observations, the premises are considered compliant with fire safety requirements at the time of inspection.")
    } else {
        parts.push("FINAL CONCLUSION: NON-COMPLIANT")
        parts.push("Based on the above observations, the premises are currently non-compliant with fire safety requirements and require corrective measures.")
    }

    return parts.join('\n')
}

// Helper to generate specific notes for a floor based on its issues
// Used for the "Auto-fill with AI" feature in FloorInspectionCard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateFloorSummary = (floor: any): string => {
    const issues: string[] = []

    // 1. Extinguishers
    if (floor.extinguishers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        floor.extinguishers.forEach((ext: any) => {
            if (ext.status !== 'Okay' && ext.status !== 'Not Available') {
                issues.push(`${ext.location} extinguisher is ${ext.status.toLowerCase()}.`)
            }
        })
    }

    // 2. Fire Alarm
    if (floor.fire_alarm?.status === 'Not Okay') {
        issues.push("Fire alarm system reported abnormality.")
    }

    // 3. Risers
    if (floor.risers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        floor.risers.forEach((riser: any) => {
            if (riser.sprinkler.status !== 'Okay') {
                issues.push(`Sprinkler at ${riser.name}: ${riser.sprinkler.status}.`)
            }
            if (riser.hydrant_valve.status !== 'Okay' && riser.hydrant_valve.status !== 'Not Available') {
                issues.push(`Hydrant valve at ${riser.name}: ${riser.hydrant_valve.status}.`)
            }
            if (riser.hose_reel.status !== 'Okay' && riser.hose_reel.status !== 'Not Available') {
                issues.push(`Hose reel at ${riser.name}: ${riser.hose_reel.status}.`)
            }
        })
    }

    // 4. Refuge
    if (floor.refuge_area?.status === 'Obstructed / Occupied') {
        issues.push("Refuge area is obstructed.")
    }

    if (issues.length === 0) return "No visible issues found on this floor."
    return issues.join(' ')
}
