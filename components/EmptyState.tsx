'use client'

import Link from 'next/link'
import { LucideIcon, Plus } from 'lucide-react'

type EmptyStateProps = {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    actionUrl?: string
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    actionUrl
}: EmptyStateProps) {
    return (
        <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
                <Icon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
            </p>
            {actionLabel && actionUrl && (
                <div className="mt-6">
                    <Link
                        href={actionUrl}
                        className="liquid-button inline-flex items-center font-medium"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        {actionLabel}
                    </Link>
                </div>
            )}
        </div>
    )
}
