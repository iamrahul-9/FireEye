'use client'

import { useState, useEffect } from 'react'
import { createInspectorUser } from '@/app/actions/admin'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { LiquidInput, LiquidButton } from '@/components/Liquid'
import { UserPlus, Shield, Users } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import FireEyeLoader from '@/components/FireEyeLoader'
import { useRouter } from 'next/navigation'
import ClientAssignmentModal from '@/components/ClientAssignmentModal'

type Profile = {
    id: string
    full_name: string
    email: string
    role: string
}

export default function AdminTeamPage() {
    const [form, setForm] = useState({ email: '', fullName: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [inspectors, setInspectors] = useState<Profile[]>([])
    const [loadingTeam, setLoadingTeam] = useState(true)
    const { showToast } = useToast()
    const router = useRouter() // Import useRouter from next/navigation

    useEffect(() => {
        const protectRoute = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return // Handled by middleware/layout

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                showToast('Unauthorized access', 'error')
                router.push('/dashboard')
            } else {
                fetchInspectors()
            }
        }
        protectRoute()
    }, [])

    const fetchInspectors = async () => {
        setLoadingTeam(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'inspector')
            .order('email') // or created_at if available

        if (error) {
            console.error('Error fetching team:', error)
        } else {
            setInspectors(data || [])
        }
        setLoadingTeam(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.email || !form.password || !form.fullName) {
            showToast('Please fill in all fields', 'error')
            return
        }

        setLoading(true)
        try {
            // Get current admin user ID
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                showToast('Not authenticated', 'error')
                setLoading(false)
                return
            }

            const result = await createInspectorUser({
                ...form,
                adminUserId: user.id
            })

            if (result.success) {
                showToast(`Inspector ${form.fullName} created successfully!`, 'success')
                setForm({ email: '', fullName: '', password: '' })
                fetchInspectors() // Refresh list
            } else {
                showToast(result.error || 'Failed to create user', 'error')
            }
        } catch (error) {
            showToast('An unexpected error occurred', 'error')
        } finally {
            setLoading(false)
        }
    }

    const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean, inspector: Profile | null }>({
        isOpen: false,
        inspector: null
    })

    const openAssignments = (inspector: Profile) => {
        setAssignmentModal({ isOpen: true, inspector })
    }

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <PageHeader
                title="Team Management"
                subtitle="Manage your inspection team"
                actionLabel="Invite via Email"
                actionIcon={UserPlus}
                actionUrl="#" // Placeholder for future invite system
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Inspector Card */}
                <div className="liquid-card p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Add Inspector</h2>
                            <p className="text-sm text-gray-500">Create a new account manually</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <LiquidInput
                            label="Full Name"
                            placeholder="John Doe"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        />
                        <LiquidInput
                            label="Email Address"
                            type="email"
                            placeholder="inspector@fireeye.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                        <LiquidInput
                            label="Temporary Password"
                            type="text" // Visible for admin convenience
                            placeholder="Secret123!"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />

                        <div className="pt-4">
                            <LiquidButton type="submit" className="w-full" disabled={loading}>
                                {loading ? <FireEyeLoader size="xs" /> : 'Create Account'}
                            </LiquidButton>
                        </div>
                    </form>
                </div>

                <div className="liquid-card p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-full">
                            <Users className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold">Active Inspectors</h3>
                    </div>

                    {loadingTeam ? (
                        <div className="text-center py-8 text-gray-500">Loading team...</div>
                    ) : inspectors.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 opacity-60">
                            <p>No inspectors found.</p>
                            <p className="text-sm">Invite one to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {inspectors.map((inspector) => (
                                <div key={inspector.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-primary/20 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {inspector.full_name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{inspector.full_name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500">{inspector.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openAssignments(inspector)}
                                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            <Shield size={12} /> Assign
                                        </button>
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Assignments Modal */}
            <ClientAssignmentModal
                isOpen={assignmentModal.isOpen}
                onClose={() => setAssignmentModal({ ...assignmentModal, isOpen: false })}
                inspectorId={assignmentModal.inspector?.id || ''}
                inspectorName={assignmentModal.inspector?.full_name || ''}
            />
        </div>
    )
}
