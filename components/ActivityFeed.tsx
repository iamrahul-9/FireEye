'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Clock, CheckCircle, XCircle, AlertTriangle, Play, FileText, UserPlus } from 'lucide-react'
import FireEyeLoader from './FireEyeLoader'
import { cn } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

interface NotificationLog {
    id: string
    type: string
    recipient: string
    message: string
    status: string // 'Unread' | 'Read' | 'Approved' | 'Denied'
    created_at: string
    action_required?: boolean
    metadata?: any
}

export default function ActivityFeed() {
    const [logs, setLogs] = useState<NotificationLog[]>([])
    const [loading, setLoading] = useState(true)
    const { showToast } = useToast()

    const fetchLogs = useCallback(async () => {
        const { data, error } = await supabase
            .from('notification_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('[ActivityFeed] Fetch Error:', error)
        } else {
            setLogs((data as NotificationLog[]) || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchLogs()

        // Subscription for real-time updates
        const channel = supabase
            .channel('activity_feed')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notification_logs' },
                () => { fetchLogs() }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchLogs])

    const handleAction = async (id: string, action: 'Approved' | 'Denied') => {
        // Optimistic Update
        setLogs(prev => prev.map(log =>
            log.id === id ? { ...log, status: action } : log
        ))

        const { error } = await supabase
            .from('notification_logs')
            .update({ status: action })
            .eq('id', id)

        if (error) {
            showToast('Failed to update status', 'error')
            fetchLogs() // Revert on error
        } else {
            showToast(`Action ${action}`, 'success')
        }
    }

    if (loading) return <FireEyeLoader size="sm" />

    if (logs.length === 0) return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500 h-full">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No recent activity.</p>
        </div>
    )

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pl-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Live Activity Feed</h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {logs.map(log => {
                    const isActionRequired = log.action_required && log.status === 'Unread'

                    return (
                        <div key={log.id} className={cn(
                            "p-3 rounded-xl border transition-all animate-fade-in text-left",
                            isActionRequired
                                ? "bg-orange-500/5 border-orange-500/30"
                                : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10"
                        )}>
                            <div className="flex items-start gap-3">
                                {/* Icon based on Type */}
                                <div className={cn(
                                    "p-2 rounded-full mt-0.5",
                                    log.type.includes('Report') ? "bg-blue-500/10 text-blue-500" :
                                        log.type.includes('Inspection') ? "bg-purple-500/10 text-purple-500" :
                                            log.type.includes('Client') ? "bg-green-500/10 text-green-500" :
                                                "bg-gray-200 dark:bg-white/10 text-gray-500"
                                )}>
                                    {log.type.includes('Report') ? <FileText className="h-4 w-4" /> :
                                        log.type.includes('Inspection') ? <CheckCircle className="h-4 w-4" /> :
                                            log.type.includes('Client') ? <UserPlus className="h-4 w-4" /> :
                                                <Mail className="h-4 w-4" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className="text-sm font-bold truncate pr-2">{log.type}</p>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug mb-2">
                                        {log.message}
                                    </p>

                                    {/* Actions */}
                                    {isActionRequired ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => handleAction(log.id, 'Approved')}
                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <CheckCircle className="h-3 w-3" /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(log.id, 'Denied')}
                                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <XCircle className="h-3 w-3" /> Deny
                                            </button>
                                        </div>
                                    ) : (
                                        log.status === 'Approved' ? (
                                            <div className="flex items-center gap-1 text-xs text-green-500 font-bold">
                                                <CheckCircle className="h-3 w-3" /> Approved
                                            </div>
                                        ) : log.status === 'Denied' ? (
                                            <div className="flex items-center gap-1 text-xs text-red-500 font-bold">
                                                <XCircle className="h-3 w-3" /> Denied
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
