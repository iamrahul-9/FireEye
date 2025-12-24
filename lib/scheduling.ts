import { addMonths, isWeekend, addDays, isSameDay, differenceInDays, startOfDay } from 'date-fns'

export type SchedulingStatus = 'Upcoming' | 'Due Today' | 'Pending' | 'Urgent' | 'None'

/**
 * Calculates the next inspection date based on submission date.
 * Rules:
 * - Adds 3 months
 * - If falls on weekend, moves to next Monday
 * - (Future: Check Indian Holidays)
 */
export const calculateNextInspectionDate = (submissionDate: Date | string = new Date()): Date => {
    let date = new Date(submissionDate)

    // Add 3 months
    date = addMonths(date, 3)

    // Handle Weekends (0 = Sunday, 6 = Saturday)
    // If Saturday, add 2 days -> Monday
    // If Sunday, add 1 day -> Monday
    if (isWeekend(date)) {
        const day = date.getDay()
        if (day === 6) { // Saturday
            date = addDays(date, 2)
        } else if (day === 0) { // Sunday
            date = addDays(date, 1)
        }
    }

    // TODO: Indian Holiday Check can be added here
    // const holidays = ['2025-01-26', '2025-08-15', ...]
    // while (isHoliday(date)) date = addDays(date, 1)

    return date
}

/**
 * Determines the scheduling status for a client.
 * Rules:
 * - Upcoming: Within next 7 days
 * - Due Today: Exact match
 * - Pending: Missed but within 7 days grace
 * - Urgent: Missed by more than 7 days
 */
export const getSchedulingStatus = (nextDate: string | Date | null | undefined): SchedulingStatus => {
    if (!nextDate) return 'None'

    const today = startOfDay(new Date())
    const target = startOfDay(new Date(nextDate))

    // Days Remaining (Target - Today)
    const diff = differenceInDays(target, today)

    // Due Today
    if (isSameDay(target, today)) return 'Due Today'

    // Upcoming (Positive diff, <= 7 days)
    if (diff > 0 && diff <= 7) return 'Upcoming'

    // Passed Dates (Negative diff)
    if (diff < 0) {
        // Pending (Grace period: 0 to -7 days)
        if (diff >= -7) return 'Pending'

        // Urgent (More than 7 days late)
        return 'Urgent'
    }

    return 'None'
}

export const getStatusColor = (status: SchedulingStatus): string => {
    switch (status) {
        case 'Upcoming': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        case 'Due Today': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold'
        case 'Pending': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        case 'Urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold animate-pulse'
        default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
}
