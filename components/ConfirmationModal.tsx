'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationModalProps {
    isOpen: boolean
    title: string
    message: React.ReactNode
    onConfirm: () => void
    onCancel: () => void
    isLoading?: boolean
    confirmLabel?: string
    showCancel?: boolean
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading,
    confirmLabel = 'Confirm',
    showCancel = true
}: ConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className={`
                min-w-[320px] max-w-sm w-full rounded-2xl p-4 shadow-2xl border
                backdrop-blur-xl backdrop-saturate-150 scale-100
                bg-yellow-500/10 border-yellow-500/20 shadow-yellow-500/10
                animate-slide-up
            `}>
                <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex-shrink-0 text-yellow-500">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            {title}
                        </h3>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">
                            {message}
                        </div>

                        <div className="flex items-center gap-3">
                            {showCancel && (
                                <button
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg shadow-lg shadow-yellow-500/20 transition-all"
                            >
                                {isLoading ? 'Processing...' : confirmLabel}
                            </button>
                        </div>
                    </div>
                    {showCancel && (
                        <button
                            onClick={onCancel}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
