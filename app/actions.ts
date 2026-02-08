'use server'

import { sendAssignmentEmail, sendCriticalIssueAlert } from '@/lib/email'

export async function sendAssignmentEmailAction(props: {
    inspectorEmail: string
    inspectorName: string
    clientName: string
    date: string
    inspectionId: string
}) {
    console.log('Server Action: Sending Assignment Email to', props.inspectorEmail)
    return await sendAssignmentEmail(props)
}

export async function sendCriticalAlertAction(props: {
    clientName: string
    issuesCount: number
    inspectionId: string
}) {
    // In production, fetch all admins from DB. For now, use env or fallback.
    const adminEmail = process.env.ADMIN_EMAIL || 'onboarding@resend.dev'
    console.log('Server Action: Sending Critical Alert to', adminEmail)
    return await sendCriticalIssueAlert({ ...props, adminEmail })
}


