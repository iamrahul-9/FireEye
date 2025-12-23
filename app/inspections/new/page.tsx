'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { ArrowLeft, Loader2, Save, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import DynamicInspectionForm from '@/components/DynamicInspectionForm'



function NewInspectionContent({ isAdmin }: { isAdmin: boolean }) {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            const { data } = await supabase
                .from('clients')
                .select('*')
                .order('name', { ascending: true })

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
    const [isAdmin, setIsAdmin] = useState(false)
    const { showToast } = useToast()
    const router = useRouter() // Use router for navigation

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                setIsAdmin(profile?.role === 'admin')
            }
        }
        checkAdmin()
    }, [])

    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <div className="relative">
                <NewInspectionContent isAdmin={isAdmin} />
            </div>
        </Suspense>
    )
}
