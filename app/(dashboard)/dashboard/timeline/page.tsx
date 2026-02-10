'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import FireEyeLoader from '@/components/FireEyeLoader'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
} from 'date-fns'
import Link from 'next/link'

type CalendarEvent = {
    id: string
    title: string
    date: Date
    type: 'inspection' | 'scheduled'
    status: 'Completed' | 'Action Required' | 'Scheduled' | 'Overdue' | 'Pending'
    clientId: string
}

export default function TimelinePage() {
    const [loading, setLoading] = useState(true)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])

    useEffect(() => {
        fetchCalendarData()
    }, [])

    const fetchCalendarData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Future Scheduled Inspections (from Clients)
            const { data: clients } = await supabase
                .from('clients')
                .select('id, name, next_inspection_date')
                .not('next_inspection_date', 'is', null)

            const scheduledEvents: CalendarEvent[] = (clients || []).map(client => {
                const date = new Date(client.next_inspection_date)
                const isOverdue = new Date() > date && new Date().toDateString() !== date.toDateString()
                return {
                    id: `scheduled-${client.id}`,
                    title: client.name,
                    date: date,
                    type: 'scheduled',
                    status: isOverdue ? 'Overdue' : 'Scheduled',
                    clientId: client.id
                }
            })

            // 2. Fetch Past Inspections
            const { data: inspections } = await supabase
                .from('inspections')
                .select('id, created_at, status, clients(name, id)')
                .order('created_at', { ascending: false })

            const pastEvents: CalendarEvent[] = (inspections || []).map(insp => ({
                id: insp.id,
                title: (insp.clients as any)?.name || 'Unknown',
                date: new Date(insp.created_at),
                type: 'inspection',
                status: insp.status as any,
                clientId: (insp.clients as any)?.id
            }))

            setEvents([...scheduledEvents, ...pastEvents])

        } catch (error) {
            console.error('Error fetching calendar:', error)
        } finally {
            setLoading(false)
        }
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const resetToToday = () => setCurrentMonth(new Date())

    const [focusedDay, setFocusedDay] = useState<string | null>(null)

    const renderEvent = (event: CalendarEvent, isDetailed: boolean) => {
        // Styles for "Boxy" look - cleaner, less "alert-like"
        let baseClass = "bg-gray-50 border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-300"

        // STATUS COLORS UPDATED:
        if (event.status === 'Completed') baseClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"

        // Action Required -> Yellow
        if (event.status === 'Action Required') baseClass = "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-500"

        // Pending -> Purple
        if (event.status === 'Pending') baseClass = "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"

        if (event.status === 'Scheduled') baseClass = "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"

        // Urgent/Overdue -> Red
        if (event.status === 'Overdue') baseClass = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"

        return (
            <Link
                href={event.type === 'inspection' ? `/inspections/${event.id}/edit` : `/clients/${event.clientId}`}
                key={event.id}
                className={`
                    block w-full rounded-sm sm:rounded-md border transition-all hover:scale-[1.02] active:scale-95 relative z-10 group
                    ${baseClass}
                    ${isDetailed ? 'p-2' : 'p-0.5 sm:p-1.5'}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-start gap-1.5 h-full px-1.5">
                    {/* Status Dot */}
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${event.status === 'Overdue' ? 'bg-red-500 animate-pulse' :
                        event.status === 'Completed' ? 'bg-emerald-500' :
                            event.status === 'Action Required' ? 'bg-yellow-500' :
                                event.status === 'Pending' ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />

                    <span className="truncate font-semibold text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
                        {event.title}
                    </span>
                </div>
            </Link>
        )
    }

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        const days = eachDayOfInterval({ start: startDate, end: endDate })

        // Calculate dynamic row heights based on activity
        const totalWeeks = Math.ceil(days.length / 7)
        const rowWeights = []

        for (let i = 0; i < totalWeeks; i++) {
            const weekStart = i * 7
            const weekDays = days.slice(weekStart, weekStart + 7)
            const maxEventsInWeek = Math.max(...weekDays.map(d =>
                events.filter(e => isSameDay(e.date, d)).length
            ))

            // "Shrink empty weeks, expand busy ones" strategy
            // 0 events -> 0.5fr (compact)
            // 1-2 events -> 1fr (normal)
            // 3+ events -> 1.3fr (expanded to fit)
            let weight = '1fr'
            if (maxEventsInWeek === 0) weight = '0.5fr'
            else if (maxEventsInWeek > 2) weight = '1.3fr'

            rowWeights.push(weight)
        }

        const gridStyle = {
            gridTemplateRows: rowWeights.join(' ')
        }

        return (
            // GAP COLOR High Contrast (white/15), OUTER BORDER REMOVED (borderless)
            <div
                className="grid grid-cols-7 h-full bg-gray-200 dark:bg-white/15 gap-px"
                style={gridStyle}
            >
                {days.map((day, i) => {
                    const dayKey = day.toISOString()
                    const dayEvents = events.filter(e => isSameDay(e.date, day))
                    const isFocused = focusedDay === dayKey

                    const MAX_VISIBLE = 2
                    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE)
                    const hiddenCount = dayEvents.length - MAX_VISIBLE

                    return (
                        <div
                            key={day.toString()}
                            className={`
                                relative group flex flex-col p-1 transition-colors
                                ${!isSameMonth(day, currentMonth) ? 'bg-gray-50/50 dark:bg-[#111]/95 text-gray-400' : 'bg-white dark:bg-[#0A0A0A]'}
                                ${isToday(day) ? 'bg-primary/5' : ''}
                            `}
                            onClick={(e) => {
                                if (isFocused) {
                                    e.stopPropagation()
                                    setFocusedDay(null)
                                }
                            }}
                        >
                            {/* EXPANDED OVERLAY: Portal-like absolute positioning */}
                            {isFocused && (
                                <div className="absolute inset-x-0 top-0 z-[50] bg-white dark:bg-[#0A0A0A] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 rounded-lg overflow-hidden flex flex-col min-h-[120%] animate-in zoom-in-95 duration-200 origin-top">
                                    <div className="p-2 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/80 dark:bg-white/5 backdrop-blur-sm sticky top-0 z-10">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{format(day, 'EEE, MMM d')}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFocusedDay(null); }}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full transition-colors"
                                        >
                                            <ChevronRight className="h-3 w-3 rotate-45 text-gray-500" />
                                        </button>
                                    </div>
                                    <div className="p-1 overflow-y-auto custom-scrollbar max-h-[300px] flex flex-col gap-1.5 h-full">
                                        {dayEvents.map(event => renderEvent(event, true))}
                                    </div>
                                </div>
                            )}

                            {/* Date Header */}
                            <div className="flex justify-between items-start mb-1 shrink-0 px-1 pt-1">
                                <span className={`
                                    text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday(day) ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-500'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Events List */}
                            <div className="flex-1 flex flex-col gap-1.5 w-full min-w-0 px-1 pb-1">
                                {visibleEvents.map(event => renderEvent(event, false))}

                                {hiddenCount > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setFocusedDay(dayKey)
                                        }}
                                        className="mt-auto w-full text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md py-1 transition-colors group-hover:bg-gray-200 dark:group-hover:bg-white/10"
                                    >
                                        + {hiddenCount} More
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (loading) return <FireEyeLoader fullscreen text="Loading Calendar..." />

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col animate-fade-in gap-4">
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Inspection Calendar</h1>
                    <p className="text-sm text-gray-500">Master Schedule & Historical Timeline</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all shadow-lg backdrop-blur-md"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <div className="liquid-card p-0 flex flex-col flex-1 overflow-hidden relative border border-white/10 shadow-2xl bg-white/50 dark:bg-black/40 backdrop-blur-xl">
                {/* Header Controls - Liquid Theme */}
                <div className="p-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-white/5 shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-48 font-black text-lg pl-2 text-gray-800 dark:text-white tracking-tight">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            <span className="tabular-nums">{format(currentMonth, 'MMMM yyyy')}</span>
                        </div>
                        <div className="flex gap-1 bg-gray-100/50 dark:bg-white/5 rounded-xl p-1 border border-gray-200/50 dark:border-white/5">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all active:scale-95 shadow-sm text-gray-600 dark:text-gray-300">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all active:scale-95 shadow-sm text-gray-600 dark:text-gray-300">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={resetToToday}
                        className="text-xs font-bold text-primary border border-primary/20 bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all uppercase tracking-wider shadow-sm"
                    >
                        Today
                    </button>
                </div>

                {/* Week Day Headers - Scrollable on Mobile */}
                <div className="overflow-x-auto custom-scrollbar no-scrollbar-on-mobile">
                    <div className="grid grid-cols-7 gap-px border-b border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-white/15 shrink-0 min-w-[800px]">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-3 text-center text-[10px] sm:text-xs font-black uppercase text-gray-400 tracking-widest opacity-70 bg-gray-50/50 dark:bg-black/80">
                                {day}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Calendar Grid - Scrollable on Mobile */}
                <div className="flex-1 w-full relative min-h-0 overflow-x-auto custom-scrollbar">
                    <div className="absolute inset-0 min-w-[800px]">
                        {renderCalendar()}
                    </div>
                </div>

                {/* Legend Footer */}
                <div className="shrink-0 p-3 border-t border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Action Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Urgent</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
