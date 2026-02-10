'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { InspectionData } from '@/types/inspection'
import { generateInspectionSummary } from '@/lib/smartSummary'



// ------------------------------------------------------------------
// 🤖 CUSTOM AI INSTRUCTIONS
// ------------------------------------------------------------------
const CUSTOM_INSTRUCTIONS = `
    STRICT OUPUT TEMPLATE:
    
    EXECUTIVE OVERVIEW
    [1 sentence status. E.g., "Building fire systems are operational with 2 critical exceptions."]

    CRITICAL FINDINGS
    - [Item: Issue (Location)]
    - [Item: Issue (Location)]
    (If none, write "None".)

    OPERATIONAL HIGHLIGHTS
    - [Summarize working systems in 1 sentence.]
    - [Summarize healthy floors e.g., "12 floors are fully operational." DO NOT list them.]

    RECOMMENDATIONS
    - [Action 1]
    - [Action 2]

    RULES:
    1. NO MARKDOWN. Do NOT use **bold**, *italics*, or # headers.
    2. USE HYPHENS (-) for lists. DO NOT use asterisks (*).
    3. BE EXTREMELY CONCISE. No fluff.
    4. Group healthy items (e.g. "All pumps auto").
    5. HEADERS MUST BE CAPITALIZED AND PLAIN TEXT (NO BRACKETS).
`

export async function generateSmartSummary(data: InspectionData, aiConfig?: { apiKey: string, model: string }) {
    // 1. Determine Config (Custom vs Env)
    const apiKey = aiConfig?.apiKey || process.env.GOOGLE_API_KEY
    const modelName = aiConfig?.model || 'gemini-2.5-flash-lite' // User requested default

    // If no API key at all, immediately use local fallback
    if (!apiKey) {
        console.log('[SmartSummary] No API key available, using local fallback')
        const localSummary = generateInspectionSummary(data)
        return { text: localSummary, fallback: true }
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: modelName })

        // 1. Pre-process Data to save tokens
        const healthyFloors: string[] = []
        const issueFloors: typeof data.floors = []

        data.floors.forEach(floor => {
            const hasIssues = 
                floor.extinguishers.some(e => e.status !== 'Okay') ||
                floor.fire_alarm.status !== 'Okay' ||
                floor.risers.some(r => r.sprinkler.status !== 'Okay' || r.hydrant_valve.status !== 'Okay' || r.hose_reel.status !== 'Okay') ||
                floor.refuge_area?.status === 'Obstructed / Occupied' ||
                (floor.notes && floor.notes.trim() !== '')

            if (hasIssues) {
                issueFloors.push(floor)
            } else {
                healthyFloors.push(floor.name)
            }
        })

        // 2. Build Context
        let context = `FULL INSPECTION DATA:\n\n`

        // Systems
        context += `--- BUILDING SYSTEMS ---\n`
        data.systems.forEach(sys => {
            context += `- ${sys.name}: ${sys.status} ${sys.notes ? `(Note: ${sys.notes})` : ''}\n`
        })

        // Pumps
        context += `\n--- PUMPING EQUIPMENT ---\n`
        data.pumps.forEach(pump => {
            context += `- ${pump.name}: ${pump.status} (Pressure: ${pump.pressure || 'N/A'}, Remarks: ${pump.remarks || 'None'})\n`
        })

        // Healthy Floors Summary
        if (healthyFloors.length > 0) {
            context += `\n--- FULLY OPERATIONAL FLOORS (NO ISSUES) ---\n`
            context += `The following floors passed all checks (Extinguishers, Alarms, Risers, Refuge): ${healthyFloors.join(', ')}.\n`
        }

        // Floors with Issues
        if (issueFloors.length > 0) {
            context += `\n--- FLOORS WITH ISSUES / NOTES ---\n`
            issueFloors.forEach(floor => {
                context += `\n[Floor: ${floor.name}]\n`
                
                // Extinguishers
                const badExt = floor.extinguishers.filter(e => e.status !== 'Okay')
                badExt.forEach(e => context += `  - ISSUE: Extinguisher at ${e.location} is ${e.status}\n`)

                // Fire Alarm
                if (floor.fire_alarm.status !== 'Okay') {
                    context += `  - ISSUE: Fire Alarm is ${floor.fire_alarm.status}\n`
                }

                // Risers
                floor.risers.forEach((r, idx) => {
                    const issues = []
                    if (r.sprinkler.status !== 'Okay') issues.push(`Sprinkler ${r.sprinkler.status}`)
                    if (r.hydrant_valve.status !== 'Okay') issues.push(`Hydrant ${r.hydrant_valve.status}`)
                    if (r.hose_reel.status !== 'Okay') issues.push(`Hose Reel ${r.hose_reel.status}`)
                    
                    if (issues.length > 0) {
                        context += `  - ISSUE: Riser ${idx + 1} has faults: ${issues.join(', ')}\n`
                    }
                })

                // Refuge - Fixed Logic: Check for explicit obstruction
                if (floor.refuge_area && floor.refuge_area.status === 'Obstructed / Occupied') {
                    context += `  - ISSUE: Refuge Area is Obstructed / Occupied\n`
                }

                // Inspector Notes
                if (floor.notes && floor.notes.trim()) {
                    context += `  - INSPECTOR MANUAL NOTES: "${floor.notes}"\n`
                }
            })
        }

        const result = await model.generateContent(CUSTOM_INSTRUCTIONS + "\n\n" + context)
        const text = result.response.text()
        return { text }

    } catch (error: unknown) {
        // ── FAILSAFE: Fall back to local summary engine ──
        console.error('[SmartSummary] AI failed, falling back to local engine:', error)
        const localSummary = generateInspectionSummary(data)
        return { text: localSummary, fallback: true }
    }
}

