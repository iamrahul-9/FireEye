'use client'

import Link from 'next/link'
import { LucideIcon, ArrowLeft } from 'lucide-react'
import { LiquidButton } from './Liquid'

type PageHeaderProps = {
    title: string
    subtitle: string
    backUrl?: string
    actionLabel?: string
    actionUrl?: string
    onActionClick?: () => void
    actionIcon?: LucideIcon
    children?: React.ReactNode
}

export default function PageHeader({
    title,
    subtitle,
    backUrl,
    actionLabel,
    actionUrl,
    onActionClick,
    actionIcon: Icon,
    children
}: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
                {backUrl && (
                    <Link
                        href={backUrl}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                    </Link>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white h1-glow">{title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {children}
                {actionLabel && (actionUrl || onActionClick) && (
                    <LiquidButton
                        href={actionUrl}
                        onClick={!actionUrl ? onActionClick : undefined}
                        icon={Icon}
                    >
                        {actionLabel}
                    </LiquidButton>
                )}
            </div>
        </div>
    )
}
