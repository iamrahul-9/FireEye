'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { InspectionData } from '@/components/DynamicInspectionForm'

interface CopilotContextType {
    inspectionData: InspectionData | null
    setInspectionData: (data: InspectionData | null) => void
    isChatOpen: boolean
    setIsChatOpen: (open: boolean) => void
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined)

export function CopilotProvider({ children }: { children: ReactNode }) {
    const [inspectionData, setInspectionData] = useState<InspectionData | null>(null)
    const [isChatOpen, setIsChatOpen] = useState(false)

    return (
        <CopilotContext.Provider value={{ inspectionData, setInspectionData, isChatOpen, setIsChatOpen }}>
            {children}
        </CopilotContext.Provider>
    )
}

export function useCopilot() {
    const context = useContext(CopilotContext)
    if (context === undefined) {
        throw new Error('useCopilot must be used within a CopilotProvider')
    }
    return context
}
