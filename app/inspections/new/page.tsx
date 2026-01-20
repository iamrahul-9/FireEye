'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { UserPlus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DynamicInspectionForm from '@/components/DynamicInspectionForm'



function NewInspectionContent() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (!user) return

            // Fetch role FIRST
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const userIsAdmin = profile?.role === 'admin'
            setIsAdmin(userIsAdmin)

            // Then fetch clients based on role
            let query = supabase
                .from('clients')
                .select(userIsAdmin
                    ? '*'
                    : '*, client_assignments!inner(inspector_id)'
                )
                .order('name', { ascending: true })

            if (!userIsAdmin) {
                query = query.eq('client_assignments.inspector_id', user.id)
            }

            const { data, error } = await query

            if (error) {
                console.error('Client fetch error:', error)
            }

            setClients(data || [])
            setLoading(false)
        }
        init()
    }, [])

    if (loading) return <div className="text-center p-8 text-gray-500">Loading clients...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <PageHeader
                title="New Inspection"
                subtitle="Conduct a client-based safety audit"
                backUrl="/inspections"
                actionLabel={isAdmin ? "Add Client" : undefined}
                actionUrl={isAdmin ? "/clients/new" : undefined}
                actionIcon={isAdmin ? UserPlus : undefined}
            />

            <DynamicInspectionForm clients={clients} user={user} />
        </div>
    )
}

export default function NewInspectionPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <div className="relative">
                <NewInspectionContent />
            </div>
        </Suspense>
    )
}
