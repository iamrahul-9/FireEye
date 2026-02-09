import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Note: This client has FULL ACCESS to the database. Use with caution.
// It should only be used in API routes or Server Actions, NEVER on the client side.
export const getSupabaseAdmin = () => {
    if (!supabaseServiceRoleKey) {
        console.error('SERVER: SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail.')
        throw new Error('Supabase Service Role Key is missing in environment variables.')
    }
    
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

