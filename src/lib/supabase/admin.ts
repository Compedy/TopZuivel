import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types'

export function createAdminClient(): SupabaseClient<Database> {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
