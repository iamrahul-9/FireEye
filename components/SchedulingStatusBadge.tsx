import { SchedulingStatus, getStatusColor } from '@/lib/scheduling'
import { Calendar, AlertCircle, Clock } from 'lucide-react'

interface Props {
    status: SchedulingStatus
    date?: string | Date | null
    showIcon?: boolean
    className?: string
}

export default function SchedulingStatusBadge({ status, date, showIcon = true, className = '' }: Props) {
    if (status === 'None') return null

    const colorClass = getStatusColor(status)

    let Icon = Calendar
    if (status === 'Urgent') Icon = AlertCircle
    if (status === 'Pending') Icon = Clock
    if (status === 'Due Today') Icon = AlertCircle

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-transparent ${colorClass} ${className}`}>
            {showIcon && <Icon className="w-3.5 h-3.5" />}
            <span>
                {status}
                {date && status !== 'Due Today' && status !== 'Urgent' && status !== 'Pending' && (
                    <span className="opacity-75 ml-1">
                        ({new Date(date).toLocaleDateString()})
                    </span>
                )}
            </span>
        </span>
    )
}
