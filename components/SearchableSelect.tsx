'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

type Option = {
    value: string
    label: string
}

type SearchableSelectProps = {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    className = ''
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const selectedOption = options.find(opt => opt.value === value)

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {/* Trigger Button */}
            <div
                onClick={() => {
                    setIsOpen(!isOpen)
                    if (!isOpen) setSearchTerm('')
                }}
                className={`
                    w-full px-4 py-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all
                    ${isOpen
                        ? 'bg-white dark:bg-white/10 border-primary ring-2 ring-primary/20'
                        : 'bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }
                `}
            >
                <span className={`text-sm ${selectedOption ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-full z-50 animate-fade-in-down">
                    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#1a1a1a]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white placeholder-gray-400"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSearchTerm('')
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => {
                                            onChange(option.value)
                                            setIsOpen(false)
                                            setSearchTerm('')
                                        }}
                                        className={`
                                            px-4 py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors
                                            ${value === option.value
                                                ? 'bg-primary/10 text-primary font-bold'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        {option.label}
                                        {value === option.value && <Check className="h-4 w-4" />}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
