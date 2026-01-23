'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types'
import { cookies } from 'next/headers'

type ProductUpdate = Database['public']['Tables']['products']['Update']

export async function updateProduct(id: string, updates: ProductUpdate) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

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

type ProductInsert = Database['public']['Tables']['products']['Insert']

export async function addProduct(product: ProductInsert) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminSupabase = createAdminClient() as any

    const { data, error } = await adminSupabase
        .from('products')
        .insert({
            ...product,
            is_active: product.is_active ?? true,
            sort_order: product.sort_order ?? 999 // Default to end of list
        })
        .select()
        .single()

    if (error) {
        console.error('Add product error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    revalidatePath('/shop')
    return { success: true, product: data }
}
