'use client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from '@/lib/utils'

type StatusBadgeProps = {
    status: string
    className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Operational':
            case 'Completed':
                return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'Maintenance Needed':
            case 'Pending':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            case 'Critical Failure':
            case 'Flagged':
                return 'bg-red-500/10 text-red-500 border-red-500/20'
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        }
    }

    const styles = getStatusStyles(status); // Define styles variable

    return (
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles} ${className || ''}`}>
            {status}
        </div>
    )
}
