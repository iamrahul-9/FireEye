import { InspectionData } from '@/components/DynamicInspectionForm'

export const generateInspectionSummary = (data: InspectionData): string => {
    const criticalIssues: string[] = []
    const observations: string[] = []
    let isCompliant = true

    // --- 1. ANALYZE FLOORS ---
    data.floors.forEach(floor => {
        // Critical: Extinguisher Expired or Low Pressure
        if (floor.extinguisher.status === 'Expired' || floor.extinguisher.status === 'Pressure Low') {
            criticalIssues.push(`Fire extinguishers on ${floor.name} were found to be ${floor.extinguisher.status.toLowerCase()}.`)
            isCompliant = false
        }
        // Critical: Hydrant Issues
        if (floor.hydrant?.valve === 'Leaking' || floor.hydrant?.valve === 'Jam') {
            criticalIssues.push(`Hydrant valves on ${floor.name} are ${floor.hydrant.valve.toLowerCase()}.`)
            isCompliant = false
        }
        if (floor.hydrant?.hose === 'Damaged' || floor.hydrant?.hose === 'Missing') {
            criticalIssues.push(`Hose reels on ${floor.name} are ${floor.hydrant.hose.toLowerCase()}.`)
            isCompliant = false
        }
        // Critical: Alarm Fault
        if (floor.alarm?.status === 'Fault') {
            criticalIssues.push(`Fire alarm system on ${floor.name} shows a fault condition.`)
            isCompliant = false
        }
        // Critical: Refuge Locked
        if (floor.refuge_area?.status === 'Locked' || floor.refuge_area?.status === 'Obstructed / Occupied') {
            criticalIssues.push(`Refuge area on ${floor.name} is ${floor.refuge_area.status.toLowerCase()}, posing a serious safety risk.`)
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

    return parts.join("\n")
}
