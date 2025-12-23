'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(7)
        setToasts((prev) => [...prev, { id, type, message }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Backdrop Blur Overlay & Immersive Effects */}
            <div
                className={`fixed inset-0 z-[49] transition-all duration-500 overflow-hidden print:hidden ${toasts.length > 0
                    ? 'bg-black/20 backdrop-blur-sm opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                    }`}
            />

            {/* Centered Toast Container */}
            <div className="fixed inset-0 z-[50] flex flex-col items-center justify-center pointer-events-none p-4 print:hidden">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            pointer-events-auto transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) animate-in fade-in zoom-in-95 slide-in-from-bottom-2
                            min-w-[320px] max-w-sm w-full rounded-2xl p-4 shadow-2xl border
                            backdrop-blur-xl backdrop-saturate-150 mb-4 scale-100
                            ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 shadow-green-500/10' : ''}
                            ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 shadow-red-500/10' : ''}
                            ${toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 shadow-orange-500/10' : ''}
                            ${toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/10' : ''}
                        `}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex-shrink-0
                                ${toast.type === 'success' ? 'text-green-500' : ''}
                                ${toast.type === 'error' ? 'text-red-500' : ''}
                                ${toast.type === 'warning' ? 'text-orange-500' : ''}
                                ${toast.type === 'info' ? 'text-blue-500' : ''}
                            `}>
                                {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
                                {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
                                {toast.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                                {toast.type === 'info' && <Info className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 pt-0.5">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
