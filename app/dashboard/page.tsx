'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, CheckCircle, AlertTriangle, Calendar, Plus, Clock, ChevronsRight, Send } from 'lucide-react'
import { sendNotification } from '@/lib/notifications'
import FireEyeLoader from '@/components/FireEyeLoader'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { getSchedulingStatus } from '@/lib/scheduling'
import SchedulingStatusBadge from '@/components/SchedulingStatusBadge'
import InspectionTimeline, { TimelineEvent } from '@/components/InspectionTimeline'
import { useToast } from '@/contexts/ToastContext'
import { LiquidButton } from '@/components/Liquid'
import NotificationHistory from '@/components/NotificationHistory'

export default function DashboardPage() {
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)

    // Zone 1: KPIs
    const [stats, setStats] = useState({
        totalInspections: 0,
        complianceRate: 0,
        actionRequired: 0,
        criticalOpen: 0
    })

    // Zone 2: Action Lists
    const [actionListTab, setActionListTab] = useState<'upcoming' | 'pending' | 'urgent'>('upcoming')
    const [upcomingInspections, setUpcomingInspections] = useState<any[]>([])
    const [pendingInspections, setPendingInspections] = useState<any[]>([])
    const [urgentInspections, setUrgentInspections] = useState<any[]>([])

    // Zone 3: Timeline
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // --- 1. Fetch Stats ---
            const { count: totalCount } = await supabase.from('inspections').select('*', { count: 'exact', head: true })
            const { count: completedCount } = await supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'Completed')
            const { count: nonCompliantCount } = await supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'Action Required')

            // Calculate Total Critical Issues (Sum of counts)
            const { data: criticalData } = await supabase
                .from('inspections')
                .select('critical_issues_count')
                .eq('status', 'Action Required')

            const criticalOpenCount = (criticalData || []).reduce((acc, curr) => acc + (curr.critical_issues_count || 0), 0)

            const total = totalCount || 0
            const completed = completedCount || 0
            const rate = total > 0 ? Math.round((completed / total) * 100) : 100

            setStats({
                totalInspections: total,
                complianceRate: rate,
                actionRequired: nonCompliantCount || 0,
                criticalOpen: criticalOpenCount
            })

            // --- 2. Action Lists Data (Clients) ---
            const { data: clients } = await supabase
                .from('clients')
                .select('id, name, next_inspection_date, address')
                .not('next_inspection_date', 'is', null)
                .order('next_inspection_date', { ascending: true })

            const today = new Date()
            const upcoming: any[] = []
            const pending: any[] = []
            const urgent: any[] = []
            const futureTimeline: TimelineEvent[] = [];

            (clients || []).forEach(client => {
                const date = new Date(client.next_inspection_date)
                const status = getSchedulingStatus(client.next_inspection_date)

                // Categorize for Action Lists
                // Categorize for Action Lists
                if (status === 'Urgent') {
                    const diffDays = Math.ceil((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                    urgent.push({ ...client, status, overdueDays: diffDays })
                } else if (status === 'Pending') {
                    pending.push({ ...client, status })
                } else {
                    upcoming.push({ ...client, status })
                }

                // Add to Timeline (Future)
                futureTimeline.push({
                    id: `future-${client.id}`,
                    clientName: client.name,
                    date: date,
                    status: status as any
                })
            })

            setUpcomingInspections(upcoming.slice(0, 10))
            setPendingInspections(pending)
            setUrgentInspections(urgent)

            // --- 3. Timeline Data (Past Inspections) ---
            const { data: pastInspections } = await supabase
                .from('inspections')
                .select('id, created_at, status, compliance_score, clients(name)')
                .order('created_at', { ascending: false })
                .limit(20)

            const pastTimeline: TimelineEvent[] = (pastInspections || []).map(insp => ({
                id: insp.id,
                clientName: Array.isArray(insp.clients) ? insp.clients[0]?.name : (insp as any).clients?.name || 'Unknown Client',
                date: new Date(insp.created_at),
                status: insp.status as any,
                complianceScore: insp.compliance_score
            }))

            setTimelineEvents([...pastTimeline, ...futureTimeline])

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            showToast('Failed to load dashboard data', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSendReminder = async (client: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const result = await sendNotification({
                clientId: client.id,
                type: 'Manual Reminder',
                recipient: client.email || 'Client Contact',
                message: `Reminder: Inspection for ${client.name} is due on ${new Date(client.next_inspection_date).toLocaleDateString()}`,
                sentBy: user.id
            })

            if (!result.success) throw result.error

            showToast(`Reminder sent for ${client.name}`, 'success')
        } catch (error) {
            console.error('Error sending reminder:', error)
            showToast('Failed to log reminder', 'error')
        }
    }

    if (loading) {
        return <FireEyeLoader fullscreen text="Loading Command Center..." />
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <PageHeader
                title="Command Center"
                subtitle="Operational Overview & Action Items"
                actionLabel="Quick Start Inspection"
                actionUrl="/inspections/new"
                actionIcon={Plus}
            />

            {/* ZONE 1: KPI SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="liquid-card p-5 hover:scale-[1.02] transition-transform flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Inspections</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{stats.totalInspections}</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                        <Activity className="h-6 w-6" />
                    </div>
                </div>
                <div className="liquid-card p-5 hover:scale-[1.02] transition-transform flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Compliance Rate</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{stats.complianceRate}%</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stats.complianceRate >= 90 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        <CheckCircle className="h-6 w-6" />
                    </div>
                </div>
                <div className="liquid-card p-5 hover:scale-[1.02] transition-transform flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Non-Compliant</p>
                        <p className="text-3xl font-black text-red-500 mt-1">{stats.actionRequired}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                </div>
                <div className="liquid-card p-5 hover:scale-[1.02] transition-transform flex items-center justify-between bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <div>
                        <p className="text-sm font-medium text-primary uppercase tracking-wide">Critical Issues</p>
                        <p className="text-3xl font-black text-primary mt-1">{stats.criticalOpen}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-black/20 rounded-xl text-primary shadow-sm">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {/* ZONE 2: ACTION LISTS */}
            <div className="liquid-card overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-white/5">
                    <button
                        onClick={() => setActionListTab('upcoming')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${actionListTab === 'upcoming' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        Upcoming
                        <span className="ml-2 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
                            {upcomingInspections.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActionListTab('pending')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${actionListTab === 'pending' ? 'bg-orange-500/5 text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        Pending Actions
                        <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                            {pendingInspections.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActionListTab('urgent')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${actionListTab === 'urgent' ? 'bg-red-500/5 text-red-600 border-b-2 border-red-500' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        Detailed Attention Required
                        <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                            {urgentInspections.length}
                        </span>
                    </button>
                </div>

                <div className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 dark:bg-black/20 text-gray-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Required Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {(actionListTab === 'upcoming' ? upcomingInspections : actionListTab === 'pending' ? pendingInspections : urgentInspections).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">
                                            No {actionListTab} items at the moment. Good job!
                                        </td>
                                    </tr>
                                ) : (
                                    (actionListTab === 'upcoming' ? upcomingInspections : actionListTab === 'pending' ? pendingInspections : urgentInspections).map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group whitespace-nowrap">
                                            <td className="px-6 py-4">
                                                <Link href={`/clients/${client.id}`} className="font-bold text-gray-900 dark:text-white hover:text-primary transition-colors block text-base">
                                                    {client.name}
                                                </Link>
                                                <span className="text-xs text-gray-500 block max-w-xs truncate" title={client.address}>
                                                    {client.address}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">
                                                {new Date(client.next_inspection_date).toLocaleDateString()}
                                                {client.overdueDays && (
                                                    <span className="ml-2 text-xs font-bold text-red-500">
                                                        (+{client.overdueDays}d)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <SchedulingStatusBadge status={client.status} showIcon={true} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleSendReminder(client)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-gray-500 hover:text-primary uppercase tracking-wider flex items-center gap-1 ml-auto"
                                                >
                                                    <Send className="h-3 w-3" /> Remind
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ZONE 3: INSPECTION TIMELINE */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Inspection Timeline
                    </h2>
                    <Link href="/dashboard/timeline" className="text-xs font-bold text-gray-500 hover:text-primary uppercase tracking-wider flex items-center gap-1">
                        View Full Calendar <ChevronsRight className="h-4 w-4" />
                    </Link>
                </div>
                <InspectionTimeline events={timelineEvents} />
            </div>

            {/* ZONE 4: QUICK ACTIONS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/inspections/new" className="liquid-card p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                    <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-bold text-sm">New Inspection</span>
                </Link>
                <Link href="/clients/new" className="liquid-card p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group">
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-500 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm">Add Client</span>
                </Link>
                <div className="col-span-2 md:col-span-2 liquid-card p-4 flex flex-col justify-start overflow-hidden">
                    <NotificationHistory />
                </div>
            </div>
        </div>
    )
}
