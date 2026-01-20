import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper to determine sender (use testing domain if no custom domain)
const getSender = () => {
    // Ideally this comes from env, or defaults to resend's testing domain
    return process.env.EMAIL_FROM || 'onboarding@resend.dev'
}

type AssignmentProps = {
    inspectorEmail: string
    inspectorName: string
    clientName: string
    date: string
    inspectionId: string
}

export const sendAssignmentEmail = async ({
    inspectorEmail,
    inspectorName,
    clientName,
    date,
    inspectionId
}: AssignmentProps) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is missing. Email not sent.')
        return
    }

    try {
        const { data, error } = await resend.emails.send({
            from: getSender(),
            to: inspectorEmail,
            subject: `New Inspection Assignment: ${clientName}`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2>Hello ${inspectorName},</h2>
                    <p>You have been assigned a new inspection.</p>
                    <ul>
                        <li><strong>Client:</strong> ${clientName}</li>
                        <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
                    </ul>
                    <p>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/inspections/${inspectionId}" style="background: #F97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                            View Inspection
                        </a>
                    </p>
                    <p>Please log in to the dashboard to proceed.</p>
                </div>
            `
        })

        if (error) {
            console.error('Error sending assignment email:', error)
            return { success: false, error }
        }

        return { success: true, data }
    } catch (e) {
        console.error('Exception sending email:', e)
        return { success: false, error: e }
    }
}

type CriticalAlertProps = {
    adminEmail: string // Or a list
    clientName: string
    issuesCount: number
    inspectionId: string
}

export const sendCriticalIssueAlert = async ({
    adminEmail,
    clientName,
    issuesCount,
    inspectionId
}: CriticalAlertProps) => {
    if (!process.env.RESEND_API_KEY) return

    try {
        await resend.emails.send({
            from: getSender(),
            to: adminEmail,
            subject: `CRITICAL ALERT: ${issuesCount} Issues at ${clientName}`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #EF4444;">Critical Issues Detected</h2>
                    <p>Inspection at <strong>${clientName}</strong> has flagged <strong>${issuesCount} critical issues</strong>.</p>
                    <p>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/inspections/${inspectionId}" style="background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                            Review Immediately
                        </a>
                    </p>
                </div>
            `
        })
    } catch (e) {
        console.error('Failed to send critical alert', e)
    }
}
