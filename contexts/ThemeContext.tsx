'use client'

import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Use a safe layoutEffect that works with SSR
const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize theme from localStorage synchronously to avoid flash
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system'
        return (localStorage.getItem('theme') as Theme) || 'system'
    })
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem('theme', newTheme)
    }

    useSafeLayoutEffect(() => {
        const root = window.document.documentElement
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const applyTheme = () => {
            const systemDark = mediaQuery.matches
            const isDark = theme === 'dark' || (theme === 'system' && systemDark)

            if (isDark) {
                root.classList.add('dark')
                root.classList.remove('light')
                setResolvedTheme('dark')
            } else {
                root.classList.remove('dark')
                root.classList.add('light')
                setResolvedTheme('light')
            }
        }

        applyTheme()

        // Listen for system changes
        const listener = () => {
            if (theme === 'system') applyTheme()
        }

        mediaQuery.addEventListener('change', listener)
        return () => mediaQuery.removeEventListener('change', listener)

    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
