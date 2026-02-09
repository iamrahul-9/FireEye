'use server'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function createInspectorUser(data: { email: string; password: string; fullName: string; adminUserId: string }) {
    try {
        const supabaseAdmin = getSupabaseAdmin()
        // Get admin's organization from their profile
        const { data: adminProfile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id, role')
            .eq('id', data.adminUserId)
            .single()

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'Unauthorized: Admin access required' }
        }

        const orgId = adminProfile.organization_id

        // 1. Create User in Auth (Atomic creation with role)
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: false, // Require verification
            user_metadata: {
                full_name: data.fullName,
                role: 'inspector' // Handled by trigger
            }
        })

        if (createError) throw createError
        if (!user.user) throw new Error('User creation failed')

        // 2. Update the profile to set organization_id and ensure role is inspector
        // The trigger creates profile with organization, but we need to ensure it's the admin's org
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                role: 'inspector',
                organization_id: orgId
            })
            .eq('id', user.user.id)

        if (updateError) {
            console.error('Failed to update inspector profile:', updateError)
        }

        // 3. Trigger Verification Email manually (since we used admin.createUser)
        const { error: verifyError } = await supabaseAdmin.auth.resend({
            type: 'signup',
            email: data.email
        })

        if (verifyError) {
            console.error('Failed to send verification email:', verifyError)
            return { success: true, message: 'User created, but failed to send verification email. Please ask user to verify manually.' }
        }

        return { success: true, message: 'Inspector invited successfully! Verification email sent.' }
    } catch (error: any) {
        console.error('Create Inspector Error:', error)
        return { success: false, error: error.message || 'Failed to create inspector' }
    }
}

