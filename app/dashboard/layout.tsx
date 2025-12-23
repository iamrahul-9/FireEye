'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    LayoutDashboard,
    FireExtinguisher,
    ClipboardCheck,
    LogOut,
    Menu,
    X,
    Flame,
    Users,
    BarChart3,
    ChevronUp,
    Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ThemeToggle from '@/components/ThemeToggle'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)
            }
        }
        checkUser()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Timeline', href: '/dashboard/timeline', icon: Calendar },
        { label: 'Inspections', href: '/inspections', icon: ClipboardCheck },
        { label: 'Clients', href: '/clients', icon: Users },
        { label: 'Reports', href: '/reports', icon: BarChart3 },
    ]

    return (
        <div className="min-h-screen relative overflow-hidden font-sans text-gray-900 dark:text-white">
            {/* Global Floating Background Orbs - Fixed to viewport */}
            <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-orange-500/10 rounded-full blur-[120px] animate-float opacity-40 mix-blend-screen pointer-events-none z-0 print:hidden" />
            <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] animate-float-delayed opacity-30 mix-blend-screen pointer-events-none z-0 print:hidden" />

            {/* Mobile header - Fixed Sticky */}
            <div className="lg:hidden flex items-center justify-between bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 fixed top-0 left-0 right-0 z-50 print:hidden h-[60px]">
                <div className="flex items-center gap-2">
                    <Flame className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg">FireEye</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-md text-gray-500 hover:bg-white/10"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className="flex h-screen overflow-hidden relative z-10 print:h-auto print:overflow-visible pt-[60px] lg:pt-0">
                {/* Sidebar - Premium Glass with Depth */}
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 w-64 z-40 transition-transform duration-300 ease-in-out sidebar-glass print:hidden flex flex-col pt-[60px] lg:pt-0",
                        "shadow-[4px_0_24px_-6px_rgba(0,0,0,0.1),2px_0_12px_-3px_rgba(0,0,0,0.05)]",
                        "dark:shadow-[4px_0_32px_-6px_rgba(0,0,0,0.4),2px_0_16px_-3px_rgba(249,115,22,0.08)]",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full",
                        "lg:translate-x-0"
                    )}
                >
                    <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-white/10 shrink-0">
                        <div className="flex items-center space-x-3">
                            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl">
                                <Flame className="h-6 w-6 text-primary" />
                            </div>
                            <span className="text-xl font-bold tracking-tight sidebar-text-main">FireEye</span>
                        </div>
                    </div>

                    <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group sidebar-item-hover",
                                        isActive
                                            ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                                            : "sidebar-text-sub hover:translate-x-1"
                                    )}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon className={cn("mr-3 h-5 w-5 transition-colors", isActive ? "text-primary" : "text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-white")} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-4 shrink-0 relative">
                        {/* Popover Menu */}
                        {showUserMenu && (
                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl p-2 shadow-xl animate-scale-in z-50">
                                <div className="space-y-1">
                                    <div className="px-3 py-2 flex items-center justify-between rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                                        <span>Appearance</span>
                                        <ThemeToggle align="right" side="top" />
                                    </div>
                                    <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center px-3 py-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="w-full flex items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all group"
                        >
                            <div className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border border-primary/20 text-primary font-bold shrink-0">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="ml-3 flex-1 text-left overflow-hidden min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email?.split('@')[0]}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Admin Workspace</p>
                            </div>
                            <ChevronUp className={cn("h-4 w-4 text-gray-400 transition-transform", showUserMenu ? "rotate-180" : "")} />
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="lg:pl-64 relative z-10 w-full overflow-y-auto print:pl-0 print:overflow-visible">
                    {/* Removed Top Navbar */}
                    <main className="p-8 print:p-0">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
