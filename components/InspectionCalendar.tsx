'use client'

import { useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalendarInspection = {
    id: string
    date: string
    status: string
    client: {
        name: string
    }
    compliance_score?: number
}

interface InspectionCalendarProps {
    inspections: CalendarInspection[]
}

export default function InspectionCalendar({ inspections }: InspectionCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    const startDate = startOfWeek(startOfMonth(currentMonth))
    const endDate = endOfWeek(endOfMonth(currentMonth))

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const inspectionsByDate = inspections.reduce((acc, inspection) => {
        const dateKey = format(new Date(inspection.date), 'yyyy-MM-dd')
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(inspection)
        return acc
    }, {} as Record<string, CalendarInspection[]>)

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePreviousMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="text-xs font-bold uppercase px-3 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg hover:border-primary hover:text-primary transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="bg-gray-50 dark:bg-[#0A0A0A] p-2 text-center text-xs font-bold uppercase text-gray-500">
                        {day}
                    </div>
                ))}

                {/* Days */}
                {calendarDays.map((day, dayIdx) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayInspections = inspectionsByDate[dateKey] || []
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentMonth = isSameMonth(day, currentMonth)

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                                "min-h-[120px] bg-white dark:bg-[#0A0A0A] p-2 transition-all cursor-pointer relative group",
                                !isCurrentMonth && "bg-gray-50/50 dark:bg-white/5 text-gray-400",
                                isToday(day) && "bg-primary/5",
                                isSelected && "ring-2 ring-primary ring-inset z-10"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                                    isToday(day) ? "bg-primary text-white" : "text-gray-700 dark:text-gray-300"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {dayInspections.length > 0 && (
                                    <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-bold text-gray-500">
                                        {dayInspections.length}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {dayInspections.map((inspection) => (
                                    <div
                                        key={inspection.id}
                                        className={cn(
                                            "text-[10px] px-2 py-1 rounded border truncate flex items-center gap-1.5 transition-colors",
                                            inspection.compliance_score && inspection.compliance_score >= 90
                                                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                                                : inspection.compliance_score && inspection.compliance_score >= 70
                                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20"
                                                    : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20"
                                        )}
                                        title={`${inspection.client.name} - ${inspection.status}`}
                                    >
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            inspection.status === 'Completed' ? "bg-current" : "animate-pulse bg-current"
                                        )} />
                                        <span className="truncate flex-1">{inspection.client.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Hover effect for add/action could go here */}
                        </div>
                    )
                })}
            </div>

            {/* Selected Date Details (Optional, below calendar) */}
            {selectedDate && (
                <div className="mt-6 liquid-card p-4 animate-fade-in-up">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        Inspectons on {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    {(inspectionsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No inspections scheduled for this day.</p>
                    ) : (
                        <div className="space-y-2">
                            {inspectionsByDate[format(selectedDate, 'yyyy-MM-dd')].map(i => (
                                <div key={i.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            i.status === 'Completed' ? "bg-green-500" : "bg-orange-500"
                                        )} />
                                        <div>
                                            <p className="font-bold text-sm">{i.client.name}</p>
                                            <p className="text-xs text-gray-500">{i.status} • Score: {i.compliance_score}%</p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-primary hover:underline">
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
