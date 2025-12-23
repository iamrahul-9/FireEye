'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Building, MapPin, Phone, Mail, Search, UserPlus, Users, Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { LiquidButton, LiquidInput, LiquidCheckbox } from '@/components/Liquid'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/contexts/ToastContext'
import ConfirmationModal from '@/components/ConfirmationModal'
import { getSchedulingStatus } from '@/lib/scheduling'
import SchedulingStatusBadge from '@/components/SchedulingStatusBadge'
import SearchFilterBar from '@/components/SearchFilterBar'
import FireEyeLoader from '@/components/FireEyeLoader'

type Client = {
    id: string
    name: string
    address: string
    phone: string
    email: string
    type: 'Office/Store' | 'Society/Residential'
    next_inspection_date?: string
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('All')
    const [isAdmin, setIsAdmin] = useState(false)
    const { showToast } = useToast()

    // Bulk Action State
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchClients()
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

    const fetchClients = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching clients:', error)
            showToast('Failed to load clients', 'error')
        } else {
            setClients(data || [])
        }
        setLoading(false)
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedClients)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedClients(newSelected)
    }

    const handleBulkDelete = async () => {
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .in('id', Array.from(selectedClients))

            if (error) throw error

            setClients(prev => prev.filter(c => !selectedClients.has(c.id)))
            setSelectedClients(new Set())
            setIsDeleteModalOpen(false)
            showToast('Selected clients deleted successfully', 'success')
        } catch (error: any) {
            console.error('Error deleting clients:', error)
            showToast('Failed to delete clients', 'error')
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredClients = clients.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
            client.address.toLowerCase().includes(search.toLowerCase())

        const matchesType = typeFilter === 'All' || client.type === typeFilter

        return matchesSearch && matchesType
    })

    if (loading) {
        return <FireEyeLoader fullscreen text="Loading Clients..." />
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20 relative min-h-screen">
            <PageHeader
                title="Clients"
                subtitle="Manage client database"
            >
                {isAdmin && (
                    <LiquidButton
                        href="/clients/new"
                        icon={UserPlus}
                    >
                        Add Client
                    </LiquidButton>
                )}
            </PageHeader>

            {/* Universal Search Bar */}
            <SearchFilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search clients by name or address..."
                filterValue={typeFilter}
                onFilterChange={setTypeFilter}
                filterOptions={[
                    { label: 'All Types', value: 'All' },
                    { label: 'Office/Store', value: 'Office/Store' },
                    { label: 'Society/Residential', value: 'Society/Residential' }
                ]}
            />

            {/* Bulk Action Bar - Sticky Bottom or Floating */}
            {selectedClients.size > 0 && isAdmin && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0A0A0A] border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-fade-in-up">
                    <span className="font-semibold text-white">
                        {selectedClients.size} Selected
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors font-medium"
                    >
                        <Trash2 className="h-5 w-5" />
                        Delete Selected
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={() => setSelectedClients(new Set())}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Client Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Select All Header for Clients */}
                {isAdmin && clients.length > 0 && (
                    <div className="col-span-full mb-2 flex items-center gap-3 px-1">
                        <LiquidCheckbox
                            checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setSelectedClients(new Set(filteredClients.map(c => c.id)))
                                } else {
                                    setSelectedClients(new Set())
                                }
                            }}
                        />
                        <span className="text-sm font-medium text-gray-500">Select All Clients</span>
                    </div>
                )}

                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Users}
                            title="No clients found"
                            description={isAdmin ? "Add your first client to get started." : "No clients available."}
                            actionLabel={isAdmin ? "Add Client" : undefined}
                            actionUrl={isAdmin ? "/clients/new" : undefined}
                        />
                    </div>
                ) : (
                    filteredClients.map((client) => (
                        <div key={client.id} className="relative group">
                            {/* Selection Checkbox (Visible on hover or if selected) - Moved to Left */}
                            {isAdmin && (
                                <div className={`absolute top-4 left-4 z-20 transition-all duration-200 ${selectedClients.has(client.id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                    <LiquidCheckbox
                                        checked={selectedClients.has(client.id)}
                                        onCheckedChange={() => toggleSelect(client.id)}
                                        className="shadow-lg"
                                    />
                                </div>
                            )}

                            <Link
                                href={`/clients/${client.id}`}
                                className={`liquid-card p-6 block h-full transition-all hover:scale-[1.01] ${selectedClients.has(client.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <Building className="h-6 w-6 text-primary" />
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                        {client.type}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 pr-8">
                                    {client.name}
                                </h3>

                                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">{client.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 flex-shrink-0" />
                                        <span>{client.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                    {client.next_inspection_date && (
                                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-500">Next Inspection:</span>
                                            <SchedulingStatusBadge
                                                status={getSchedulingStatus(client.next_inspection_date)}
                                                date={client.next_inspection_date}
                                                showIcon={false}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </div>
                    ))
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={handleBulkDelete}
                title="Delete Clients"
                message={`Are you sure you want to delete ${selectedClients.size} selected client${selectedClients.size > 1 ? 's' : ''}? This action cannot be undone.`}
                confirmLabel="Delete"
                isLoading={isDeleting}
            />
        </div>
    )
}
