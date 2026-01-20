'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function createClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables')
    }

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )
}

export async function ensureUserProfile() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

    if (profile) {
        return { success: true, role: profile.role }
    }

    // Profile missing! Create it (Self-Healing)
    console.log(`[ProfileHealer] Profile missing for ${user.email}. Creating now...`)

    // Use Admin client to bypass RLS for insertion
    const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: user.id,
            email: user.email,
            role: 'admin', // Default to admin for self-healing logic (safest for owner)
            full_name: user.user_metadata?.full_name || 'System User'
        })

    if (insertError) {
        console.error('[ProfileHealer] Failed to create profile:', insertError)
        return { success: false, error: insertError.message }
    }

    return { success: true, status: 'healed' }
}
