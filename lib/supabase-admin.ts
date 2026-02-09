import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance - cached after first creation
let supabaseAdminInstance: SupabaseClient | null = null

/**
 * Get the Supabase Admin client with full database access.
 * 
 * Uses a singleton pattern to:
 * 1. Lazily initialize (prevents crash if env var is missing on cold start)
 * 2. Cache the instance (avoids creating new clients on every call)
 * 3. Provide clear error messages for debugging
 * 
 * IMPORTANT: This client bypasses RLS. Only use in Server Actions/API routes.
 */
export function getSupabaseAdmin(): SupabaseClient {
    // Return cached instance if available
    if (supabaseAdminInstance) {
        return supabaseAdminInstance
    }

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        throw new Error(
            '[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is missing. ' +
            'Add it to your Vercel Environment Variables.'
        )
    }

    if (!supabaseServiceRoleKey) {
        throw new Error(
            '[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is missing. ' +
            'Add it to your Vercel Environment Variables (as a secret, not public).'
        )
    }

    // Create and cache the client
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    return supabaseAdminInstance
}
