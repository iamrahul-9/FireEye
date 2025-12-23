'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import PageHeader from '@/components/PageHeader'
import { LiquidButton, LiquidCard } from '@/components/Liquid'
import { Loader2, Trash2, Edit, Building, MapPin, Phone, Mail, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ClientDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { showToast } = useToast()
    const [client, setClient] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchClient()
        checkAdmin()
    }, [])

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

    const fetchClient = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', params.id)
            .single()

        if (error) {
            console.error('Error fetching client:', error)
            showToast('Client not found', 'error')
            router.push('/clients')
        } else {
            setClient(data)
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) return

        setDeleting(true)
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', params.id)

        if (error) {
            showToast('Error deleting client', 'error')
            setDeleting(false)
        } else {
            showToast('Client deleted successfully', 'success')
            router.push('/clients')
        }
    }

    if (loading) return <div className="p-8 text-center">Loading details...</div>
    if (!client) return null

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            <PageHeader
                title={client.name}
                subtitle={client.type}
                backUrl="/clients"
            >
                {isAdmin && (
                    <>
                        <LiquidButton
                            href={`/clients/${client.id}/edit`}
                            variant="secondary"
                            icon={Edit}
                            className="bg-white/10 hover:bg-white/20 text-gray-900 dark:text-white"
                        >
                            Edit
                        </LiquidButton>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="liquid-button bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 flex items-center justify-center gap-2"
                        >
                            {deleting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                        </button>
                    </>
                )}
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <LiquidCard className="p-6 space-y-4">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2">Contact Details</h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                            <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{client.address}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                            <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                            <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>{client.email}</span>
                        </div>
                    </div>
                </LiquidCard>

                {/* Structure Info */}
                <LiquidCard className="p-6 space-y-4">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2">Building Structure</h3>
                    {client.type === 'Society/Residential' ? (
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                <p className="text-2xl font-bold text-primary">{client.structure?.basements || 0}</p>
                                <p className="text-xs text-gray-500 uppercase mt-1">Basements</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                <p className="text-2xl font-bold text-primary">{client.structure?.podiums || 0}</p>
                                <p className="text-xs text-gray-500 uppercase mt-1">Podiums</p>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                <p className="text-2xl font-bold text-primary">{client.structure?.floors || 0}</p>
                                <p className="text-xs text-gray-500 uppercase mt-1">Floors</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Standard commercial structure.</p>
                    )}
                </LiquidCard>

                {/* Systems & Rooms */}
                <LiquidCard className="p-6 space-y-4 md:col-span-2">
                    <h3 className="text-lg font-bold border-b border-gray-100 dark:border-white/10 pb-2">Systems & Infrastructure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Rooms</h4>
                            <div className="flex flex-wrap gap-2">
                                {client.structure?.rooms?.map((room: string) => (
                                    <span key={room} className="px-3 py-1 bg-white/10 border border-gray-200 dark:border-white/10 rounded-full text-sm">
                                        {room}
                                    </span>
                                )) || <span className="text-gray-400 italic">No rooms defined</span>}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Fire Safety Systems</h4>
                            <div className="space-y-2">
                                {client.structure?.systems?.map((system: string) => (
                                    <div key={system} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        {system}
                                    </div>
                                )) || <span className="text-gray-400 italic">No systems defined</span>}
                            </div>
                        </div>
                    </div>
                </LiquidCard>
            </div>
        </div>
    )
}
