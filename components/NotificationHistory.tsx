'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Clock, CheckCircle } from 'lucide-react'
import FireEyeLoader from './FireEyeLoader'

// Define proper type for notification logs
interface NotificationLog {
    id: string
    type: string
    recipient: string
    message: string
    created_at: string
    clients: {
        name: string
    } | null
}

export default function NotificationHistory() {
    const [logs, setLogs] = useState<NotificationLog[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = useCallback(async () => {
        const { data, error } = await supabase
            .from('notification_logs')
            .select('*, clients(name)')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('[NotificationHistory] Fetch Error:', error)
        } else {
            console.log('[NotificationHistory] Fetched:', data?.length, 'logs')
        }

        setLogs((data as NotificationLog[]) || [])
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchLogs()

        // Real-time subscription to auto-update logs
        const channel = supabase
            .channel('notification_logs_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification_logs'
                },
                () => {
                    fetchLogs() // Refresh to get the latest log with Client Name
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchLogs])

    if (loading) return <FireEyeLoader size="sm" />

    if (logs.length === 0) return (
        <div className="text-center p-8 text-gray-500 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications sent yet.</p>
        </div>
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Sent Emails Log (Simulated)</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">MVP Mode</span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {logs.map(log => (
                    <div key={log.id} className="p-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg flex items-start gap-3">
                        <div className="mt-1 p-1.5 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold truncate">{log.clients?.name || 'Unknown Client'}</p>
                                <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(log.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono line-clamp-1">{log.message}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400 border px-1.5 py-0.5 rounded">{log.type}</span>
                                <span className="text-[10px] text-gray-400">To: {log.recipient}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
