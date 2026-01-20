'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Organization = {
    id: string
    name: string
    slug: string
    owner_id: string
}

type OrgContextType = {
    organization: Organization | null
    loading: boolean
    refreshOrganization: () => Promise<void>
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrgProvider({ children }: { children: ReactNode }) {
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchOrganization = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setOrganization(null)
                setLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id, organizations(id, name, slug, owner_id)')
                .eq('id', user.id)
                .single()

            if (profile?.organizations) {
                setOrganization(profile.organizations as unknown as Organization)
            }
        } catch (error) {
            console.error('Error fetching organization:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrganization()
    }, [])

    const refreshOrganization = async () => {
        setLoading(true)
        await fetchOrganization()
    }

    return (
        <OrgContext.Provider value={{ organization, loading, refreshOrganization }}>
            {children}
        </OrgContext.Provider>
    )
}

export function useOrganization() {
    const context = useContext(OrgContext)
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrgProvider')
    }
    return context
}
