'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LiquidButton, LiquidCheckbox } from '@/components/Liquid'
import { X, Search } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import FireEyeLoader from '@/components/FireEyeLoader'

type Client = {
    id: string
    name: string
    address: string
}

type ClientAssignmentModalProps = {
    isOpen: boolean
    onClose: () => void
    inspectorId: string
    inspectorName: string
}

export default function ClientAssignmentModal({ isOpen, onClose, inspectorId, inspectorName }: ClientAssignmentModalProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [assignedClientIds, setAssignedClientIds] = useState<Set<string>>(new Set())
    const [assignmentMap, setAssignmentMap] = useState<Map<string, { id: string, name: string }>>(new Map()) // clientId -> { inspectorId, name }
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    useEffect(() => {
        if (isOpen && inspectorId) {
            fetchData()
        }
    }, [isOpen, inspectorId])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch All Clients
            const { data: allClients, error: clientsError } = await supabase
                .from('clients')
                .select('id, name, address')
                .order('name')

            if (clientsError) throw clientsError

            // 2. Fetch ALL Assignments to determine ownership
            // Using explicit FK reference if needed, or trying simple join if distinct enough. 
            // If checking 'inspector_id' vs 'assigned_by', we need to be careful.
            // Let's assume 'profiles' relationship is named or generic. 
            // Safe bet: Fetch profiles separately if join is tricky, but let's try standard join first.
            const { data: assignments, error: assignError } = await supabase
                .from('client_assignments')
                .select('client_id, inspector_id, profiles!client_assignments_inspector_id_fkey(full_name)')

            // Fallback strategy if FK name differs:
            // .select('client_id, inspector_id, profiles!inspector_id(full_name)')
            // We'll inspect error if this fails.

            if (assignError) {
                console.warn("Join failed, trying fallback...", assignError)
                // Fallback: Fetch just IDs and map manually from separate profile fetch?
                // Or just try simpler join
                throw assignError
            }

            setClients(allClients || [])

            const mySet = new Set<string>()
            const newMap = new Map<string, { id: string, name: string }>()

            if (assignments) {
                assignments.forEach((a: any) => {
                    if (a.inspector_id === inspectorId) {
                        mySet.add(a.client_id)
                    }
                    // Map assignment details
                    const pName = a.profiles?.full_name || 'Unknown'
                    newMap.set(a.client_id, {
                        id: a.inspector_id,
                        name: pName
                    })
                })
            }

            setAssignedClientIds(mySet)
            setAssignmentMap(newMap)

        } catch (error: any) {
            console.error('Error fetching data:', error)
            showToast('Failed to load clients', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Get current admin's organization_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) throw new Error('Organization not found')

            // Determine Additions and Removals
            // Current State: assignedClientIds
            // To properly sync, we can delete all and re-insert, or diff.
            // Diff is safer/cleaner.

            // Fetch current DB state again to be safe? Or just trust `assignedClientIds` vs initial?
            // "Sync" approach: Delete where inspector_id = ID AND client_id NOT IN (current set)
            // Insert where client_id IN (current set) AND NOT EXISTS...

            // Simpler: Delete all for this inspector, then insert all selected.
            // (Assuming cascade isn't an issue for historical data - `client_assignments` is just a link)

            // Step 1: Delete all existing assignments for this inspector
            const { error: deleteError } = await supabase
                .from('client_assignments')
                .delete()
                .eq('inspector_id', inspectorId)

            if (deleteError) throw deleteError

            // Step 2: Insert new assignments (if any)
            if (assignedClientIds.size > 0) {
                const inserts = Array.from(assignedClientIds).map(clientId => ({
                    inspector_id: inspectorId,
                    client_id: clientId,
                    organization_id: profile.organization_id,
                    assigned_by: user.id
                }))

                const { error: insertError } = await supabase
                    .from('client_assignments')
                    .insert(inserts)

                if (insertError) throw insertError
            }

            showToast('Assignments updated successfully', 'success')
            onClose()

        } catch (error: any) {
            console.error('Save error:', error)
            showToast('Failed to save assignments', 'error')
        } finally {
            setSaving(false)
        }
    }

    const toggleClient = (id: string) => {
        const newSet = new Set(assignedClientIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setAssignedClientIds(newSet)
    }

    if (!isOpen) return null

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.address?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/10">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Assign Clients</h2>
                        <p className="text-sm text-gray-500">For {inspectorName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-8"><FireEyeLoader /></div>
                        ) : filteredClients.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No clients found matching "{search}"</div>
                        ) : (
                            filteredClients.map(client => {
                                const assignment = assignmentMap.get(client.id)
                                const isAssignedToOther = assignment && assignment.id !== inspectorId

                                return (
                                    <div
                                        key={client.id}
                                        onClick={() => !isAssignedToOther && toggleClient(client.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isAssignedToOther
                                                ? 'bg-gray-50 dark:bg-black/40 border-gray-100 dark:border-white/5 opacity-70 cursor-not-allowed'
                                                : assignedClientIds.has(client.id)
                                                    ? 'bg-primary/5 border-primary/30 shadow-sm cursor-pointer'
                                                    : 'bg-transparent border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer'
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1 mr-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-bold truncate ${assignedClientIds.has(client.id) ? 'text-primary' : 'text-gray-900 dark:text-gray-300'}`}>
                                                    {client.name}
                                                </h4>
                                                {isAssignedToOther && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-white/10 text-gray-500 uppercase tracking-wide">
                                                        Unavailable
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs truncate ${isAssignedToOther ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                                {isAssignedToOther
                                                    ? `Assigned to ${assignment.name}`
                                                    : client.address
                                                }
                                            </p>
                                        </div>
                                        <LiquidCheckbox
                                            checked={assignedClientIds.has(client.id)}
                                            onCheckedChange={() => !isAssignedToOther && toggleClient(client.id)}
                                            disabled={isAssignedToOther}
                                        />
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <LiquidButton
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-6"
                    >
                        {saving ? 'Saving...' : `Assign ${assignedClientIds.size} Clients`}
                    </LiquidButton>
                </div>
            </div>
        </div>
    )
}
