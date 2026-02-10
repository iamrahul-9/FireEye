/**
 * FireEye Copilot - Offline Q&A Knowledge Base
 * 
 * Used as a fallback when the Gemini API is unavailable (quota exceeded, no key, etc.)
 * Uses keyword matching to find the best answer from a curated knowledge base.
 */

interface QAPair {
    keywords: string[]
    question: string
    answer: string
    category: 'platform' | 'safety' | 'inspection' | 'troubleshooting'
}

const KNOWLEDGE_BASE: QAPair[] = [
    // ── Platform Navigation ──
    {
        keywords: ['add', 'client', 'new client', 'create client'],
        question: 'How do I add a new client?',
        answer: '🔥 To add a new client, go to the **Clients** tab in the sidebar, then click the **"+ New Client"** button. Fill in the building name, contact person, address, and fire safety configuration details.',
        category: 'platform'
    },
    {
        keywords: ['inspection', 'new inspection', 'start inspection', 'create inspection'],
        question: 'How do I start a new inspection?',
        answer: '🔥 Go to the **Inspections** tab and click **"New Inspection"**. Select the client from the dropdown, then fill in the floor-by-floor inspection data including extinguishers, risers, alarms, and refuge areas.',
        category: 'platform'
    },
    {
        keywords: ['report', 'view report', 'download report', 'pdf', 'export'],
        question: 'How do I view or export a report?',
        answer: '🔥 Go to the **Reports** tab to see all completed inspections. Click on any report to view the details. You can export reports as **PDF** or view the **Inspection Matrix** for a summary view.',
        category: 'platform'
    },
    {
        keywords: ['team', 'inspector', 'add inspector', 'invite', 'member'],
        question: 'How do I add team members?',
        answer: '🔥 Admin users can go to the **Team** tab and click **"Invite Inspector"**. Enter their email, name, and a temporary password. They will receive a verification email to activate their account.',
        category: 'platform'
    },
    {
        keywords: ['dashboard', 'overview', 'stats', 'home'],
        question: 'What does the dashboard show?',
        answer: '🔥 The **Dashboard** provides an overview of your inspection activity including total inspections, client count, recent activity timeline, and compliance status at a glance.',
        category: 'platform'
    },
    {
        keywords: ['api', 'key', 'settings', 'gemini', 'model', 'configure'],
        question: 'How do I configure AI settings?',
        answer: '🔥 Click your **profile icon** in the top-right corner and select **"API Settings"**. You can enter your own Google Gemini API key, select a model, and verify the connection. If no custom key is provided, the system default (if configured) will be used.',
        category: 'platform'
    },
    {
        keywords: ['edit', 'client', 'update', 'modify', 'change'],
        question: 'How do I edit a client?',
        answer: '🔥 Go to the **Clients** tab, click on the client you want to edit, then click the **"Edit"** button. You can update their name, contact details, and fire safety configuration.',
        category: 'platform'
    },

    // ── Fire Safety Knowledge ──
    {
        keywords: ['extinguisher', 'type', 'abc', 'co2', 'clean agent'],
        question: 'What are the types of fire extinguishers?',
        answer: '🛡️ Common fire extinguisher types:\n- **ABC (Dry Chemical)**: Most versatile, works on Class A, B, C fires\n- **CO2**: For electrical and flammable liquid fires\n- **Clean Agent**: For sensitive electronics and server rooms\n- **Water/Foam**: For Class A fires (paper, wood)\n- **Modular**: Fixed automatic extinguishing systems\n\nExtinguishers should be inspected monthly and serviced annually per NFPA 10.',
        category: 'safety'
    },
    {
        keywords: ['nfpa', 'code', 'regulation', 'standard', 'compliance'],
        question: 'What NFPA codes should I follow?',
        answer: '🛡️ Key NFPA standards for fire safety:\n- **NFPA 1**: Fire Code (general)\n- **NFPA 10**: Portable Fire Extinguishers\n- **NFPA 13**: Sprinkler Systems\n- **NFPA 14**: Standpipes and Hose Systems\n- **NFPA 20**: Fire Pumps\n- **NFPA 25**: Inspection/Testing/Maintenance of Water-Based Systems\n- **NFPA 72**: Fire Alarm Systems\n\nAlways check with your local fire authority for jurisdiction-specific requirements.',
        category: 'safety'
    },
    {
        keywords: ['sprinkler', 'system', 'maintenance', 'test'],
        question: 'How often should sprinkler systems be tested?',
        answer: '🛡️ Per NFPA 25:\n- **Weekly**: Visual inspection of gauge readings\n- **Monthly**: Valve inspections\n- **Quarterly**: Water flow alarm tests, valve supervisory tests\n- **Annually**: Full system trip test, internal pipe inspections\n- **5 Years**: Obstruction investigation\n\nKeep detailed records of all tests for compliance.',
        category: 'safety'
    },
    {
        keywords: ['pump', 'fire pump', 'jockey', 'diesel', 'test'],
        question: 'How do I test fire pumps?',
        answer: '🛡️ Fire pump testing per NFPA 25:\n- **Weekly**: No-flow (churn) test for 10 minutes\n- **Monthly**: Flow test at design conditions\n- **Annually**: Peak load test\n\n**Diesel pumps** need additional weekly engine start tests. Check fuel level, battery, and oil pressure regularly. Record all results in the pump log.',
        category: 'safety'
    },
    {
        keywords: ['hydrant', 'hose', 'reel', 'valve', 'standpipe'],
        question: 'What should I check on hydrants and hose reels?',
        answer: '🛡️ Hydrant & Hose Reel checklist:\n- **Valve Operation**: Opens/closes smoothly, no leaks or jams\n- **Hose Condition**: No cracks, kinks, or damage; properly rolled\n- **Nozzle**: Present and functional\n- **Signage**: Clearly visible location markings\n- **Access**: Not obstructed by storage or debris\n\nReport any issues immediately for repair.',
        category: 'safety'
    },
    {
        keywords: ['alarm', 'fire alarm', 'detector', 'smoke'],
        question: 'How often should fire alarms be tested?',
        answer: '🛡️ Per NFPA 72:\n- **Monthly**: Test notification appliances and supervisory signals\n- **Semi-annually**: Test smoke detectors, heat detectors\n- **Annually**: Full system test including all initiating devices\n\nReplace smoke detector batteries annually and units every 10 years.',
        category: 'safety'
    },
    {
        keywords: ['refuge', 'area', 'safety', 'evacuation', 'emergency'],
        question: 'What are refuge area requirements?',
        answer: '🛡️ Refuge areas must be:\n- **Free of obstructions** at all times\n- **Clearly marked** with signage\n- **Accessible** from fire exits and stairways\n- **Ventilated** and structurally protected\n- **Equipped** with emergency lighting and communication\n\nRegular inspections should verify the area is not used for storage.',
        category: 'safety'
    },

    // ── Inspection Guidance ──
    {
        keywords: ['inspection', 'checklist', 'what', 'check', 'procedure'],
        question: 'What should I check during an inspection?',
        answer: '🚒 Standard inspection checklist:\n1. **Extinguishers**: Check pressure, expiry, accessibility on each floor\n2. **Fire Alarm**: Test panel, check detectors\n3. **Risers**: Check sprinklers, hydrant valves, hose reels per riser\n4. **Pumps**: Verify working status, pressure readings\n5. **Refuge Areas**: Ensure clear and accessible\n6. **Rooms**: Check housekeeping, panel accessibility, extinguisher presence\n7. **Systems**: Verify PA, CCTV, and other safety systems\n\nDocument everything with photos!',
        category: 'inspection'
    },
    {
        keywords: ['defect', 'issue', 'problem', 'non-compliant', 'fail'],
        question: 'What should I do if I find a defect?',
        answer: '🚒 When you find a defect:\n1. **Document it**: Take a photo and add notes in the inspection form\n2. **Mark the status**: Set the correct status (Expired, Leaking, Not Working, etc.)\n3. **Severity**: Critical defects (no extinguisher, pump failure) should be flagged for immediate action\n4. **Report**: The Smart Summary will automatically highlight critical findings\n5. **Follow-up**: Schedule a re-inspection after corrections are made',
        category: 'inspection'
    },
    {
        keywords: ['summary', 'smart', 'ai', 'generate', 'remarks', 'auto'],
        question: 'How does the Smart Summary work?',
        answer: '🚒 The **Smart Summary** analyzes all your inspection data (floors, pumps, systems, rooms) and generates a professional report summary. It highlights:\n- Critical findings that need immediate attention\n- Operational highlights (what\'s working)\n- Recommendations for corrective actions\n\nIf the AI is unavailable, a **local summary engine** generates the report based on the same data.',
        category: 'inspection'
    },

    // ── Troubleshooting ──
    {
        keywords: ['error', 'not working', 'broken', 'bug', 'issue', 'help'],
        question: 'Something is not working, what should I do?',
        answer: '⚙️ Try these steps:\n1. **Refresh the page** (Ctrl/Cmd + R)\n2. **Check your internet connection**\n3. **Clear browser cache** and try again\n4. **Log out and log back in**\n5. If the AI features aren\'t working, check your **API Settings** (profile icon → API Settings)\n\nIf the issue persists, contact your system administrator.',
        category: 'troubleshooting'
    },
    {
        keywords: ['password', 'forgot', 'reset', 'login', 'cant login'],
        question: 'I forgot my password',
        answer: '⚙️ Click the **"Forgot Password?"** link on the login page. Enter your email address and you\'ll receive a password reset link. Check your spam folder if you don\'t see the email within a few minutes.',
        category: 'troubleshooting'
    },
]

// Fallback greeting
const FALLBACK_GREETING = "Hi! I'm FireEye Copilot 🔥 running in **offline mode**. I can answer questions about fire safety, the platform, and inspections from my built-in knowledge. Ask me anything!"

// No match response
const NO_MATCH_RESPONSE = "I'm currently running in **offline mode** and couldn't find a specific answer for that question. Here's what I can help with:\n\n- 🏢 **Platform**: Adding clients, inspections, reports, team members\n- 🛡️ **Fire Safety**: Extinguisher types, NFPA codes, testing schedules\n- 🚒 **Inspections**: Checklists, defect handling, smart summaries\n- ⚙️ **Troubleshooting**: Common issues and fixes\n\nTry rephrasing your question or ask about one of these topics!"

/**
 * Find the best matching Q&A pair for a user message.
 * Uses keyword overlap scoring — more matches = higher score.
 */
export function findAnswer(userMessage: string): { text: string; fallback: true } {
    const normalizedInput = userMessage.toLowerCase().trim()

    // Handle greetings
    if (/^(hi|hello|hey|howdy|yo|sup|what'?s up)/i.test(normalizedInput)) {
        return { text: FALLBACK_GREETING, fallback: true }
    }

    // Score each Q&A pair by keyword overlap
    let bestMatch: QAPair | null = null
    let bestScore = 0

    for (const qa of KNOWLEDGE_BASE) {
        let score = 0
        for (const keyword of qa.keywords) {
            if (normalizedInput.includes(keyword.toLowerCase())) {
                // Longer keyword matches are worth more
                score += keyword.length
            }
        }

        if (score > bestScore) {
            bestScore = score
            bestMatch = qa
        }
    }

    // Require a minimum score threshold to avoid false matches
    if (bestMatch && bestScore >= 3) {
        return { text: bestMatch.answer, fallback: true }
    }

    return { text: NO_MATCH_RESPONSE, fallback: true }
}
