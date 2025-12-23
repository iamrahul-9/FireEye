'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useState } from 'react'

export default function ThemeToggle({ align = 'right', side = 'bottom' }: { align?: 'left' | 'right', side?: 'top' | 'bottom' }) {
    const { theme, setTheme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="liquid-button p-2"
                title="Toggle Theme"
            >
                {theme === 'light' && <Sun className="h-5 w-5" />}
                {theme === 'dark' && <Moon className="h-5 w-5" />}
                {theme === 'system' && <Monitor className="h-5 w-5" />}
            </button>

            {isOpen && (
                <div className={`
                    absolute z-50 w-32 rounded-xl liquid-card bg-white dark:bg-black/90 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden
                    ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
                    ${side === 'bottom' ? 'mt-2 top-full' : 'mb-2 bottom-full'}
                `}>
                    <div className="py-1">
                        <button
                            onClick={() => { setTheme('light'); setIsOpen(false) }}
                            className={`flex w-full items-center px-4 py-2 text-sm ${theme === 'light' ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        >
                            <Sun className="mr-3 h-4 w-4" />
                            Light
                        </button>
                        <button
                            onClick={() => { setTheme('dark'); setIsOpen(false) }}
                            className={`flex w-full items-center px-4 py-2 text-sm ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        >
                            <Moon className="mr-3 h-4 w-4" />
                            Dark
                        </button>
                        <button
                            onClick={() => { setTheme('system'); setIsOpen(false) }}
                            className={`flex w-full items-center px-4 py-2 text-sm ${theme === 'system' ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                        >
                            <Monitor className="mr-3 h-4 w-4" />
                            System
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}
        </div>
    )
}
