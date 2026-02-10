'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { InspectionData } from '@/types/inspection'
import { findAnswer } from '@/lib/copilotKnowledge'

const SYSTEM_PROMPT = `
You are "FireEye Copilot" 🔥, the expert AI Assistant for the FireEye Platform.
Your goal is to help users manage fire safety, compliance, and inspections.

**CONTEXT AWARENESS**:
- You will receive the "Current Page" the user is viewing. Use this to tailor your answers.
- If on "Dashboard": Focus on overview, stats, and navigation.
- If on "Inspection": You have access to the *live* inspection form data. Help with codes, defects, and remarks.
- If on "Reports": Help interpret data or suggest export options.

**CAPABILITIES**:
1. **Fire Code Expert**: You know NFPA and local fire safety regulations.
2. **Platform Guide**: Help users find features (e.g., "Where do I add a client?" -> "Go to the Clients tab").
3. **Drafting Assistant**: Help write professional notes for reports.

**TONE**:
Professional, proactive, and safety-focused. Use fire-related emojis (🔥, 🚒, 🛡️) sparingly but effectively.
`

export async function chatWithMarshal(
    messages: { role: 'user' | 'model'; parts: string }[], 
    data: InspectionData | any, 
    aiConfig?: { apiKey: string, model: string },
    pageContext?: string
) {
    // 1. Config
    const apiKey = aiConfig?.apiKey || process.env.GOOGLE_API_KEY
    const modelName = aiConfig?.model || 'gemini-2.5-flash-lite'

    // If no API key, immediately use Q&A fallback
    if (!apiKey) {
        console.log('[Copilot] No API key available, using Q&A fallback')
        const lastMsg = messages[messages.length - 1]?.parts || ''
        return findAnswer(lastMsg)
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: SYSTEM_PROMPT
        })

        // 2. Prepare History with Context
        // Inject Page Context and Data Status
        let contextString = `CURRENT PAGE: ${pageContext || 'Unknown'}\n`
        if (data && data.floors && data.floors.length > 0) {
            contextString += `ACTIVE INSPECTION DATA (JSON): \n${JSON.stringify(data)}`
        } else {
            contextString += `NO ACTIVE INSPECTION DATA (User is likely navigating).`
        }

        const contextMessage = {
            role: 'user',
            parts: [{ text: contextString }]
        }

        const history = [contextMessage, ...messages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.parts }]
        }))]

        const lastUserMsg = messages[messages.length - 1].parts

        const chatSession = model.startChat({
            history: history
        })

        const result = await chatSession.sendMessage(lastUserMsg)
        const responseText = result.response.text()

        return { text: responseText }

    } catch (error: unknown) {
        // ── FAILSAFE: Fall back to Q&A knowledge base ──
        console.error('[Copilot] AI failed, falling back to Q&A:', error)
        const lastMsg = messages[messages.length - 1]?.parts || ''
        return findAnswer(lastMsg)
    }
}

