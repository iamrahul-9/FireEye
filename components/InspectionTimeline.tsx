'use client'

import { useRef, useEffect } from 'react'
import { format, isSameDay, isAfter, isBefore, addDays, subDays } from 'date-fns'
import { CheckCircle, AlertTriangle, XCircle, Clock, Calendar as CalendarIcon, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TimelineEvent = {
    id: string
    clientName: string
    date: Date
    status: 'Completed' | 'Action Required' | 'Scheduled' | 'Overdue'
    complianceScore?: number
}

interface InspectionTimelineProps {
    events: TimelineEvent[]
    className?: string
}

export default function InspectionTimeline({ events, className }: InspectionTimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Center on "Today" or nearest future event on mount
    useEffect(() => {
        if (scrollRef.current) {
            const today = new Date()
            const todayIndex = sortedEvents.findIndex(e => isAfter(e.date, subDays(today, 1)))

            if (todayIndex !== -1) {
                const cardWidth = 280 // Approximate width of a card + gap
                const scrollPos = (todayIndex * cardWidth) - (scrollRef.current.clientWidth / 2) + (cardWidth / 2)
                scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' })
            }
        }
    }, [sortedEvents])

    const getStatusColor = (status: TimelineEvent['status'], score?: number) => {
        switch (status) {
            case 'Completed':
                return score && score < 100 ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-green-500 bg-green-500/10 text-green-500'
            case 'Action Required':
                return 'border-red-500 bg-red-500/10 text-red-500'
            case 'Overdue':
                return 'border-red-500 bg-red-500/20 text-red-600 animate-pulse'
            default: // Scheduled
                return 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400'
        }
    }

    const getStatusIcon = (status: TimelineEvent['status'], score?: number) => {
        switch (status) {
            case 'Completed':
                return score && score < 100 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />
            case 'Action Required':
                return <XCircle className="h-4 w-4" />
            case 'Overdue':
                return <AlertTriangle className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    return (
        <div className={cn("relative group", className)}>
            {/* Scroll Controls (Desktop) */}
            <button
                onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white dark:bg-black/80 shadow-lg rounded-full border border-gray-200 dark:border-white/10 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <button
                onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-white dark:bg-black/80 shadow-lg rounded-full border border-gray-200 dark:border-white/10 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            {/* Timeline Container */}
            <div
                ref={scrollRef}
                className="flex items-center gap-6 overflow-x-auto pb-8 pt-4 px-4 snap-x snap-mandatory custom-scrollbar relative z-10"
                style={{ scrollbarWidth: 'none' }}
            >
                {/* Timeline Line */}
                <div className="absolute left-0 right-0 top-[2.4rem] h-0.5 bg-gray-200 dark:bg-white/10 z-0 pointer-events-none min-w-max" style={{ width: `${sortedEvents.length * 280}px` }} />

                {sortedEvents.map((event, idx) => {
                    const isToday = isSameDay(event.date, new Date())
                    const isFuture = isAfter(event.date, new Date())

                    return (
                        <div
                            key={event.id}
                            className="snap-center shrink-0 w-[260px] flex flex-col relative group/card"
                        >
                            {/* Date Node */}
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-2 bg-white dark:bg-black z-10 transition-all duration-300",
                                    isToday ? "border-primary scale-125 shadow-[0_0_10px_var(--color-primary)]" :
                                        (isFuture ? "border-gray-300 dark:border-white/20" : "border-gray-800 dark:border-white/60")
                                )} />
                                <span className={cn(
                                    "text-xs font-mono font-medium",
                                    isToday ? "text-primary font-bold" : "text-gray-400"
                                )}>
                                    {format(event.date, 'MMM d, yyyy')}
                                </span>
                            </div>

                            {/* Card */}
                            <div className={cn(
                                "p-4 rounded-xl border flex flex-col gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden backdrop-blur-sm",
                                isToday ? "bg-primary/5 border-primary/30" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10"
                            )}>
                                {/* Status Stripe */}
                                <div className={cn(
                                    "absolute top-0 left-0 w-1 h-full",
                                    event.status === 'Completed' && (event.complianceScore === 100 ? 'bg-green-500' : 'bg-orange-500'),
                                    event.status === 'Action Required' && 'bg-red-500',
                                    event.status === 'Overdue' && 'bg-red-600',
                                    event.status === 'Scheduled' && 'bg-gray-300 dark:bg-white/20'
                                )} />

                                <div className="flex justify-between items-start pl-2">
                                    <h4 className="font-bold text-sm truncate pr-2" title={event.clientName}>
                                        {event.clientName}
                                    </h4>
                                    <div className={cn("p-1 rounded-md", getStatusColor(event.status, event.complianceScore))}>
                                        {getStatusIcon(event.status, event.complianceScore)}
                                    </div>
                                </div>

                                <div className="pl-2">
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold tracking-wider",
                                        event.status === 'Overdue' ? "text-red-500" : "text-gray-500"
                                    )}>
                                        {event.status}
                                    </span>
                                    {event.complianceScore !== undefined && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <div className="h-1.5 w-12 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full", event.complianceScore >= 100 ? "bg-green-500" : "bg-orange-500")}
                                                    style={{ width: `${event.complianceScore}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono">{event.complianceScore}%</span>
                                        </div>
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
