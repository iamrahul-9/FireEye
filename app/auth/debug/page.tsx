'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    const addLog = (title: string, data: any) => {
        setLogs(prev => [...prev, { title, data, time: new Date().toISOString() }])
    }

    useEffect(() => {
        const runDiagnostics = async () => {
            try {
                // 1. Check Auth Session
                const { data: { session }, error: authError } = await supabase.auth.getSession()
                addLog('1. Auth Session', { user_id: session?.user?.id, email: session?.user?.email, error: authError })

                if (!session?.user) {
                    addLog('STOP', 'No logged in user.')
                    return
                }

                // 2. Check Profile (RLS Check)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()
                addLog('2. Profile Fetch', { profile, error: profileError })

                // 3. Check Clients (RLS Check)
                const { data: clients, error: clientsError } = await supabase
                    .from('clients')
                    .select('*')
                    .limit(1)
                addLog('3. Clients Fetch', { count: clients?.length, error: clientsError })

                // 4. Check Inspections
                const { data: inspections, error: inspectionsError } = await supabase
                    .from('inspections')
                    .select('*')
                    .limit(1)
                addLog('4. Inspections Fetch', { count: inspections?.length, error: inspectionsError })

            } catch (err) {
                addLog('CRITICAL ERROR', err)
            } finally {
                setLoading(false)
            }
        }

        runDiagnostics()
    }, [])

    return (
        <div className="p-8 bg-black text-green-400 font-mono min-h-screen text-xs overflow-auto">
            <h1 className="text-xl font-bold mb-4 border-b border-green-800 pb-2">System Diagnostics</h1>
            {loading && <div className="animate-pulse">Running checks...</div>}
            <div className="space-y-4">
                {logs.map((log, i) => (
                    <div key={i} className="border border-green-900/50 p-4 rounded bg-green-900/10 hover:bg-green-900/20 transition-colors">
                        <div className="font-bold text-green-300 mb-2 flex justify-between">
                            <span>{log.title}</span>
                            <span className="opacity-50">{log.time}</span>
                        </div>
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
        </div>
    )
}
