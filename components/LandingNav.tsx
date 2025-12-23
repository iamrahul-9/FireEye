'use client'

import Link from 'next/link'
import { Flame, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function LandingNav() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [activeSection, setActiveSection] = useState('')

    // Scroll Spy Effect
    if (typeof window !== 'undefined') {
        window.addEventListener('scroll', () => {
            const sections = ['hero', 'features', 'pricing', 'contact']
            const scrollPosition = window.scrollY + 100

            for (const section of sections) {

                const element = document.getElementById(section)
                if (element && element.offsetTop <= scrollPosition && (element.offsetTop + element.offsetHeight) > scrollPosition) {
                    setActiveSection(section)
                }
            }
        })
    }

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
            setMobileMenuOpen(false)
            setActiveSection(id)
        }
    }

    // Force Dark Mode Styling (Text White, Glass)
    const getLinkClass = (id: string) => cn(
        "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
        activeSection === id
            ? "bg-white/10 text-white shadow-inner"
            : "text-gray-400 hover:text-white hover:bg-white/5"
    )

    return (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
            <nav className="w-full max-w-5xl transition-all duration-300 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full shadow-2xl shadow-black/50 flex items-center justify-between h-16 px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-3 group animate-fade-in">
                    <div className="bg-primary/20 p-1.5 rounded-full group-hover:bg-primary/30 transition-colors">
                        <Flame className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">FireEye</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                    {['hero', 'features', 'pricing', 'contact'].map((item) => (
                        <button
                            key={item}
                            onClick={() => scrollToSection(item)}
                            className={getLinkClass(item)}
                        >
                            {item === 'hero' ? 'Home' : item.charAt(0).toUpperCase() + item.slice(1)}
                        </button>
                    ))}

                    <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-white/10">
                        <Link
                            href="/login"
                            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>

                {/* Mobile menu button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-white/10"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </nav>

            {/* Mobile Navigation Dropdown (Detached & Dark) */}
            <div className={cn(
                "md:hidden absolute top-24 left-4 right-4 rounded-3xl overflow-hidden bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 origin-top",
                mobileMenuOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
            )}>
                <div className="p-6 space-y-4">
                    {['features', 'pricing', 'contact'].map((item) => (
                        <button
                            key={item}
                            onClick={() => scrollToSection(item)}
                            className={cn(
                                "block w-full text-left transition-colors font-medium py-3 px-4 rounded-xl",
                                activeSection === item ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                        </button>
                    ))}
                    <div className="border-t border-white/10 pt-4 space-y-3">
                        <Link
                            href="/login"
                            className="block w-full text-center py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors font-medium"
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            className="block w-full text-center py-3 rounded-xl bg-primary text-white font-bold"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
