'use client'

import { useState, useEffect } from 'react'
import { LiquidButton, LiquidCheckbox } from '@/components/Liquid'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Calendar, MapPin, ClipboardCheck, UserPlus, Trash2, Check } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SearchFilterBar from '@/components/SearchFilterBar'
import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import ConfirmationModal from '@/components/ConfirmationModal'
import FireEyeLoader from '@/components/FireEyeLoader'

type Inspection = {
    id: string
    date: string
    status: string
    compliance_score: number
    client: {
        name: string
        address: string
        type: string
    }
    inspector: {
        full_name: string
    }
}

export default function InspectionsPage() {
    const [inspections, setInspections] = useState<Inspection[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('All')
    const [isAdmin, setIsAdmin] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInspections.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredInspections.map(i => i.id)))
        }
    }

    const deleteSelected = () => {
        setShowDeleteModal(true)
    }

    const executeDelete = async () => {
        setLoading(true)
        const { error } = await supabase
            .from('inspections')
            .delete()
            .in('id', Array.from(selectedIds))

        if (error) {
            console.error('Error deleting:', error)
            alert('Failed to delete inspections')
        } else {
            setSelectedIds(new Set())
            fetchInspections()
        }
        setLoading(false)
        setShowDeleteModal(false)
    }

    useEffect(() => {
        fetchInspections()
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

    const fetchInspections = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('inspections')
            .select(`
                id,
                date,
                status,
                compliance_score,
                client:clients(name, address, type),
                inspector:profiles(full_name)
            `)
            .order('date', { ascending: false })

        if (error) {
            console.error('Error fetching inspections:', JSON.stringify(error, null, 2))
        } else {
            // @ts-ignore - Supabase types are tricky with joins sometimes
            setInspections(data || [])
        }
        setLoading(false)
    }

    const filteredInspections = inspections.filter(inspection => {
        const matchesSearch =
            (inspection.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (inspection.client?.address || '').toLowerCase().includes(search.toLowerCase()) ||
            (inspection.inspector?.full_name || '').toLowerCase().includes(search.toLowerCase())

        const matchesFilter = filterStatus === 'All' || inspection.status === filterStatus
        return matchesSearch && matchesFilter
    })

    if (loading) {
        return <FireEyeLoader fullscreen text="Loading Inspections..." />
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Inspections"
                subtitle="Track and manage safety audits"
                actionLabel="New Inspection"
                actionUrl="/inspections/new"
                actionIcon={Plus}
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

            <SearchFilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by client, location, or inspector..."
                filterValue={filterStatus}
                onFilterChange={setFilterStatus}
                filterOptions={[
                    { label: 'All Statuses', value: 'All' },
                    { label: 'Completed', value: 'Completed' },
                    { label: 'Action Required', value: 'Action Required' },
                    { label: 'Draft', value: 'Draft' }
                ]}
            />

            {/* Bulk Actions Bar */}
            {/* Bulk Actions Bar - Moved to Bottom Floating */}
            {isAdmin && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#0A0A0A] border border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-fade-in-up w-[90vw] max-w-md justify-center">
                    <span className="font-semibold text-white">
                        {selectedIds.size} Selected
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={deleteSelected}
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors font-medium"
                    >
                        <Trash2 className="h-5 w-5" />
                        Delete Selected
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div className="liquid-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading inspections...</div>
                ) : filteredInspections.length === 0 ? (
                    <EmptyState
                        icon={ClipboardCheck}
                        title="No inspections found"
                        description="Start by inspecting a client."
                        actionLabel="Start Inspection"
                        actionUrl="/inspections/new"
                    />
                ) : (
                    <>
                        {/* Header for Select All */}
                        {isAdmin && (
                            <div className="px-6 py-3 border-b border-gray-200/50 dark:border-white/10 flex items-center gap-4 bg-gray-50/50 dark:bg-white/5">
                                <LiquidCheckbox
                                    checked={selectedIds.size === filteredInspections.length && filteredInspections.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Select All</span>
                            </div>
                        )}
                        <ul className="divide-y divide-gray-200/50 dark:divide-white/10 w-full">
                            {filteredInspections.map((inspection) => (
                                <li key={inspection.id} className={`hover:bg-white/5 dark:hover:bg-white/5 transition-colors ${selectedIds.has(inspection.id) ? 'bg-primary/5' : ''}`}>
                                    <div className="relative px-4 py-4 sm:px-6">
                                        <div className="flex items-start">
                                            {/* Checkbox - Aligned top on mobile */}
                                            {isAdmin && (
                                                <div className="mr-3 sm:mr-4 mt-1 sm:mt-0 shrink-0">
                                                    <LiquidCheckbox
                                                        checked={selectedIds.has(inspection.id)}
                                                        onCheckedChange={() => toggleSelection(inspection.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}

                                            <Link href={`/inspections/${inspection.id}`} className="block flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">

                                                    {/* Icon & Main Info */}
                                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mt-1 sm:mt-0">
                                                            <ClipboardCheck className="h-5 w-5 text-primary" />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            {/* Row 1: Name & Mobile Badge (if we want badge on top, but maybe keep badge at bottom for flow) */}
                                                            <div className="flex justify-between items-start gap-2">
                                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">
                                                                    {inspection.client?.name || 'Unknown Client'}
                                                                </p>
                                                                {/* Badge on Mobile Header? No, keep layout clean. */}
                                                            </div>

                                                            {/* Row 2: Address */}
                                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-0.5 break-words line-clamp-2 sm:truncate sm:line-clamp-none">
                                                                {inspection.client?.address || 'Unknown Address'}
                                                            </p>

                                                            {/* Row 3: Meta Info (Date, etc) */}
                                                            <div className="flex items-center gap-3 mt-2 sm:mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <span className="flex items-center shrink-0">
                                                                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                                    {new Date(inspection.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>

                                                                {/* Inspector on Mobile */}
                                                                <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                                                                <span className="sm:hidden w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>

                                                                <span className="flex items-center truncate max-w-[100px] sm:max-w-none">
                                                                    <span className="sm:hidden font-medium mr-1">Insp:</span>
                                                                    {inspection.inspector?.full_name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Status & Inspector (Hidden Mobile) */}
                                                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                                                        <StatusBadge status={inspection.status} />
                                                    </div>

                                                    {/* Mobile Status Badge (Bottom Row) */}
                                                    <div className="sm:hidden flex mt-1">
                                                        <StatusBadge status={inspection.status} />
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                title="Delete Inspections"
                message={`Are you sure you want to delete ${selectedIds.size} selected inspection(s)? This action cannot be undone.`}
                onConfirm={executeDelete}
                onCancel={() => setShowDeleteModal(false)}
                isLoading={loading}
            />
        </div>
    )
}
