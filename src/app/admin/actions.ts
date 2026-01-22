import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types'

type ProductUpdate = Database['public']['Tables']['products']['Update']

export async function updateProduct(id: string, updates: ProductUpdate) {
    const supabase = await createClient()

    // Verify Admin Role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminSupabase = createAdminClient() as any

    const { error } = await adminSupabase
        .from('products')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error('Update product error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    revalidatePath('/shop')
    return { success: true }
}
