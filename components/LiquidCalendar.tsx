'use client'

import { useState } from 'react'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameMonth,
    isSameDay,
    isToday,
    isWithinInterval,
    isBefore,
    isAfter
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DateRange = {
    from: Date | null
    to: Date | null
}

export type LiquidCalendarProps = {
    selectedRange: DateRange
    onChange: (range: DateRange) => void
    className?: string
    mode?: 'single' | 'range'
}

export default function LiquidCalendar({
    selectedRange = { from: null, to: null },
    onChange,
    className = '',
    mode = 'range'
}: LiquidCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedRange.from || new Date())
    const [hoverDate, setHoverDate] = useState<Date | null>(null)

    const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const handleDateClick = (date: Date) => {
        if (mode === 'single') {
            onChange({ from: date, to: null })
            return
        }

        if (!selectedRange.from || (selectedRange.from && selectedRange.to)) {
            // Start new range
            onChange({ from: date, to: null })
        } else {
            // Complete range
            if (isBefore(date, selectedRange.from)) {
                onChange({ from: date, to: selectedRange.from })
            } else {
                onChange({ from: selectedRange.from, to: date })
            }
        }
    }

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4 px-1">
                <button
                    onClick={(e) => { e.preventDefault(); onPrevMonth(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white hover:scale-110 active:scale-95"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-white tracking-wide">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                </div>
                <button
                    onClick={(e) => { e.preventDefault(); onNextMonth(); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white hover:scale-110 active:scale-95"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        )
    }

    const renderWeekDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
        return (
            <div className="grid grid-cols-7 mb-2 text-center">
                {days.map(day => (
                    <div key={day} className="h-6 flex items-center justify-center text-[10px] font-bold uppercase text-white/30 tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
        )
    }

    const renderDays = () => {
        const startDate = startOfWeek(startOfMonth(currentMonth))
        const endDate = endOfWeek(endOfMonth(currentMonth))

        const days = []
        let day = startDate

        while (day <= endDate) {
            const cloneDay = day
            const isCurrentMonth = isSameMonth(day, currentMonth)

            // Range Logic
            const isStart = selectedRange.from && isSameDay(day, selectedRange.from)
            const isEnd = mode === 'range' && selectedRange.to && isSameDay(day, selectedRange.to)
            const isInRange = mode === 'range' && selectedRange.from && selectedRange.to && isWithinInterval(day, { start: selectedRange.from, end: selectedRange.to })

            // Preview logic (only for range mode)
            const isPreviewRange = mode === 'range' && !selectedRange.to && selectedRange.from && hoverDate &&
                ((isAfter(day, selectedRange.from) && isBefore(day, hoverDate)) || (isBefore(day, selectedRange.from) && isAfter(day, hoverDate)) || isSameDay(day, hoverDate))

            // Styles
            let bgClass = ''
            let textClass = !isCurrentMonth ? 'text-white/20' : 'text-white/80'
            let roundedClass = 'rounded-md' // Default rounded

            if (isStart || isEnd) {
                bgClass = 'bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/30 z-10 scale-105'
                textClass = 'text-white font-bold'
                roundedClass = 'rounded-lg'
            } else if (isInRange) {
                bgClass = 'bg-primary/20'
                textClass = 'text-primary-100'
                roundedClass = 'rounded-none' // Connected look
                // Handle edges of range
                if (isSameDay(day, startOfWeek(day))) roundedClass += ' rounded-l-lg'
                if (isSameDay(day, endOfWeek(day))) roundedClass += ' rounded-r-lg'
            } else if (isPreviewRange) {
                bgClass = 'bg-white/5 border border-dashed border-white/20'
            } else {
                bgClass = 'hover:bg-white/10'
            }

            // Margin/Connecting logic
            // Start of range gets right connection
            if (isStart && selectedRange.to && mode === 'range') roundedClass = 'rounded-l-lg rounded-r-none relative z-10'
            // End of range gets left connection
            if (isEnd && selectedRange.from && mode === 'range') roundedClass = 'rounded-r-lg rounded-l-none relative z-10'
            // Single selection or Start without End in Range mode
            if (isStart && (!selectedRange.to || mode === 'single')) roundedClass = 'rounded-lg'


            days.push(
                <div
                    key={day.toString()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDateClick(cloneDay); }}
                    onMouseEnter={() => setHoverDate(cloneDay)}
                    className={`
                        relative h-8 w-full flex items-center justify-center text-[11px] font-medium cursor-pointer transition-all duration-150
                        ${bgClass} ${textClass} ${roundedClass}
                        ${isToday(day) && !isStart && !isEnd && !isInRange ? 'ring-1 ring-primary/50 text-white' : ''}
                    `}
                >
                    {format(day, 'd')}
                </div>
            )
            day = addDays(day, 1)
        }
        return <>{days}</>
    }

    return (
        <div className={`w-[280px] p-4 bg-[#111] backdrop-blur-3xl border border-white/5 rounded-2xl shadow-xl shadow-black/50 ${className}`}>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
                {renderHeader()}
                {renderWeekDays()}
                <div className="grid grid-cols-7 gap-y-0.5">
                    {renderDays()}
                </div>

                {/* Footer Info */}
                <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-white/50">
                    <span>
                        {selectedRange.from ? format(selectedRange.from, 'MMM d') : 'Select'}
                        {mode === 'range' && (
                            <>
                                {' - '}
                                {selectedRange.to ? format(selectedRange.to, 'MMM d') : (selectedRange.from ? '...' : '')}
                            </>
                        )}
                    </span>
                    {mode === 'range' && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                            {selectedRange.from && selectedRange.to
                                ? `${Math.abs(Math.floor((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24))) + 1} Days`
                                : 'Select Range'
                            }
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
