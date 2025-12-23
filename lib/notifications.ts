
import { supabase } from './supabase'

export type NotificationType = 'Manual Reminder' | 'Upcoming Inspection' | 'Urgent Action' | 'Report Generated'

interface SendNotificationParams {
    clientId: string
    type: NotificationType
    recipient: string // Email
    message: string
    sentBy?: string // User ID (optional, null for system)
    inspectionId?: string
}

/**
 * Sends a notification (Email/SMS) and logs it to the database.
 * Currently simulates sending by logging to console.
 */
export async function sendNotification({
    clientId,
    type,
    recipient,
    message,
    sentBy,
    inspectionId
}: SendNotificationParams) {
    console.log(`[NOTIFICATION SYSTEM] Sending ${type} to ${recipient}: ${message}`)

    // 1. In a real app, integrate Resend/SendGrid/Twilio here.
    // await emailProvider.send(...)

    // 2. Log to Database
    const { error } = await supabase
        .from('notification_logs')
        .insert({
            client_id: clientId,
            type,
            recipient,
            message,
            sent_by: sentBy || null,
            inspection_id: inspectionId || null,
            status: 'Sent'
        })

    if (error) {
        console.error('Failed to log notification:', error)
        return { success: false, error }
    }

    return { success: true }
}

/**
 * Checks for auto-triggers (e.g., Upcoming Inspections) and sends notifications.
 * This should ideally run via a Cron Job or Edge Function.
 * For this MVP, we can trigger it on Dashboard load or manually.
 */
export async function runAutoNotifications() {
    console.log('[AUTO-NOTIFICATIONS] Checking triggers...')

    // 1. Calculate Date Range (Next 7 Days)
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    // 2. Find Clients with upcoming inspections
    // We filter clients where next_inspection_date is between today and next week
    const { data: upcomingClients, error } = await supabase
        .from('clients')
        .select('id, name, email, next_inspection_date')
        .gte('next_inspection_date', today.toISOString())
        .lte('next_inspection_date', nextWeek.toISOString())

    if (error) {
        console.error('Failed to fetch clients for notifications:', error)
        return { success: false, error }
    }

    if (!upcomingClients || upcomingClients.length === 0) {
        console.log('[AUTO-NOTIFICATIONS] No upcoming inspections found.')
        return { success: true, count: 0 }
    }

    console.log(`[AUTO-NOTIFICATIONS] Found ${upcomingClients.length} clients due for inspection.`)

    let sentCount = 0

    // 3. Send Notifications
    for (const client of upcomingClients) {
        // Optional: Check if we already sent a reminder for this specific date?
        // For this demo, we'll just send it. In prod, we'd check `notification_logs`.

        // Note: For client-side triggering (MVP), we might want to capture the current user ID
        // But since this function doesn't receive it, we'll leave it null (System) 
        // OR we would need to fetch it.
        // The RLS policy requires 'sent_by' to match auth.uid() OR 'client.user_id' to match auth.uid().
        // If sent_by is NULL, the "Insert as sender" policy fails.
        // We relying on the user owning the client for this to work if sent_by is NULL?
        // Actually, let's fetch the current user to be safe and attribute it to them triggering the job.

        const { data: { user } } = await supabase.auth.getUser()

        const result = await sendNotification({
            clientId: client.id,
            type: 'Upcoming Inspection',
            recipient: client.email || 'Admin',
            message: `Routine Inspection for ${client.name} is due on ${new Date(client.next_inspection_date).toLocaleDateString()}. Please schedule.`,
            sentBy: user?.id // Attribute to the user triggering the auto-check
        })

        if (result.success) sentCount++
    }

    return { success: true, count: sentCount }
}
