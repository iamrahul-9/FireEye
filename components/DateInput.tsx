'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react'
import { format } from 'date-fns'
import { createPortal } from 'react-dom'
import LiquidCalendar from './LiquidCalendar'

interface DateInputProps {
    value?: string | Date | null
    onChange: (date: Date | null) => void
    label?: string
    placeholder?: string
    className?: string
}

export default function DateInput({ value, onChange, label, placeholder = 'Select date', className = '' }: DateInputProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ top: 0, left: 0, width: 280 })

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const scrollY = window.scrollY
            const scrollX = window.scrollX

            // Always open downwards as requested
            const top = rect.bottom + scrollY + 8
            const left = rect.left + scrollX

            setPosition({ top, left, width: rect.width })
        }
    }

    // Update position when opening
    useEffect(() => {
        if (isOpen) {
            updatePosition()
        }
    }, [isOpen])

    // Anchor logic: Reposition on scroll/resize instead of closing
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            // Capture scroll events to handle scrolling of any scrollable container
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', updatePosition, true)
            window.removeEventListener('resize', updatePosition)
        }
    }, [isOpen])

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(null)
    }

    const displayDate = value ? (typeof value === 'string' ? new Date(value) : value) : null

    return (
        <>
            <div className={`relative ${className}`} ref={containerRef}>
                {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>}

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation() // Prevent immediate close
                        setIsOpen(!isOpen)
                    }}
                    className={`
                        w-full flex items-center justify-between px-4 py-3 
                        bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 
                        rounded-xl shadow-sm transition-all duration-300
                        hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                        ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}
                    `}
                >
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className={displayDate ? 'font-medium' : 'text-gray-400'}>
                            {displayDate ? format(displayDate, 'PPP') : placeholder}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        {displayDate && (
                            <div
                                role="button"
                                onClick={handleClear}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-red-500 transition-colors mr-1"
                            >
                                <X className="h-3 w-3" />
                            </div>
                        )}
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>
            </div>

            {isOpen && createPortal(
                <div
                    className="absolute z-[9999] animate-fade-in-down origin-top-left"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent document click from closing when clicking inside
                >
                    <LiquidCalendar
                        mode="single"
                        selectedRange={{ from: displayDate, to: null }}
                        onChange={(range) => {
                            if (range.from) {
                                onChange(range.from)
                                setIsOpen(false)
                            }
                        }}
                    />
                </div>,
                document.body
            )}
        </>
    )
}
