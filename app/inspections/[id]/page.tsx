'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
    ArrowLeft,
    MapPin,
    User,
    CheckCircle,
    AlertTriangle,
    Shield
} from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import PageHeader from '@/components/PageHeader'
import InspectionMatrix from '@/components/InspectionMatrix'
import FireEyeLoader from '@/components/FireEyeLoader'

type InspectionDetail = {
    id: string
    date: string
    status: string
    compliance_score: number
    critical_issues_count: number
    findings: any // Structured data (floors, systems, pumps)
    ai_summary: string
    client: {
        name: string
        address: string
        client_type: string
    }
    inspector: {
        full_name: string
        email: string
    }
}

export default function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [inspection, setInspection] = useState<InspectionDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchInspection()
    }, [id])

    const fetchInspection = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('inspections')
            .select(`
                *,
                client:clients(*),
                inspector:profiles(full_name, email)
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching inspection:', error)
        } else {
            setInspection(data)
        }
        setLoading(false)
    }

    if (loading) {
        return <FireEyeLoader fullscreen text="Loading Inspection Details..." />
    }

    if (!inspection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inspection Not Found</h2>
                <Link href="/inspections" className="liquid-button inline-flex items-center text-sm font-medium">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inspections
                </Link>
            </div>
        )
    }

    // Use stored compliance score from database
    const passRate = inspection.compliance_score || 0

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Inspection Report (View Only)"
                    subtitle={`#${inspection.id.slice(0, 8)} • ${new Date(inspection.date).toLocaleString()}`}
                    backUrl="/inspections"
                />
                <div className="flex items-center gap-3">
                    <StatusBadge status={inspection.status} />
                </div>
            </div>

            {/* Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Client Info */}
                <div className="liquid-card p-6 space-y-4">
                    <div className="flex items-center gap-3 text-gray-900 dark:text-white font-semibold">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3>Client Details</h3>
                    </div>
                    {inspection.client ? (
                        <div className="space-y-2">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{inspection.client.name}</p>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <MapPin className="h-4 w-4 mr-2" />
                                {inspection.client.address}
                            </div>
                            <div className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {inspection.client.client_type}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-500 font-medium">
                            Client data unavailable or deleted.
                        </div>
                    )}
                </div>

                {/* Inspector Info */}
                <div className="liquid-card p-6 space-y-4">
                    <div className="flex items-center gap-3 text-gray-900 dark:text-white font-semibold">
                        <User className="h-5 w-5 text-blue-500" />
                        <h3>Inspector</h3>
                    </div>
                    {inspection.inspector ? (
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{inspection.inspector.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{inspection.inspector.email}</p>
                        </div>
                    ) : (
                        <div className="text-sm text-red-500 font-medium">
                            Inspector data unavailable.
                        </div>
                    )}
                </div>

                {/* Score Card */}
                <div className="liquid-card p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-3 text-gray-900 dark:text-white font-semibold">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <h3>Pass Rate</h3>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">{passRate}%</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Compliance</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${passRate >= 100 ? 'bg-green-500' :
                                    passRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${passRate}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Checklist & Findings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-8">
                    <InspectionMatrix findings={inspection.findings} />
                </div>

                {/* Sidebar: Summary/Remarks */}
                <div className="space-y-6">
                    <div className="liquid-card p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Inspector Remarks</h3>
                        <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5 min-h-[150px]">
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {inspection.findings?.remarks || inspection.ai_summary || "No remarks provided."}
                            </p>
                        </div>

                        {/* Future AI Section Placeholder */}
                        {passRate < 100 && (
                            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <h4 className="text-sm font-bold text-blue-500 mb-1">AI Recommendation</h4>
                                <p className="text-xs text-blue-400/80">
                                    Based on the failed items, we recommend scheduling maintenance immediately.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
