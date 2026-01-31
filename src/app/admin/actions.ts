'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Database, RecurringOrder, RecurringOrderItem } from '@/types'
import { cookies } from 'next/headers'
import { getCustomWeekData } from '@/lib/date-utils'

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
            type_group: product.type_group || 'Algemeen',
            weight_per_unit: product.weight_per_unit || 0,
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

// RECURRING ORDERS ACTIONS

export async function getRecurringOrders() {
    const adminSupabase = createAdminClient() as any
    const { data, error } = await adminSupabase
        .from('recurring_orders')
        .select('*, recurring_order_items(*)')
        .order('company_name', { ascending: true })

    if (error) {
        console.error('Error fetching recurring orders:', error)
        return []
    }
    return data as (RecurringOrder & { recurring_order_items: RecurringOrderItem[] })[]
}

export async function upsertRecurringOrder(
    order: Partial<RecurringOrder>,
    items: { product_id: string, quantity: number }[]
) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient() as any

    let orderId = order.id

    if (orderId) {
        // Update existing
        const { error: updateError } = await adminSupabase
            .from('recurring_orders')
            .update({
                company_name: order.company_name,
                email: order.email,
                price_modifier: order.price_modifier,
                is_active: order.is_active
            })
            .eq('id', orderId)

        if (updateError) return { success: false, error: updateError.message }

        // Delete old items
        await adminSupabase.from('recurring_order_items').delete().eq('recurring_order_id', orderId)
    } else {
        // Create new
        const { data: newOrder, error: createError } = await adminSupabase
            .from('recurring_orders')
            .insert({
                company_name: order.company_name!,
                email: order.email!,
                price_modifier: order.price_modifier || 0,
                is_active: order.is_active ?? true
            })
            .select()
            .single()

        if (createError) return { success: false, error: createError.message }
        orderId = newOrder.id
    }

    // Insert items
    const { error: itemsError } = await adminSupabase
        .from('recurring_order_items')
        .insert(items.map(item => ({
            recurring_order_id: orderId!,
            product_id: item.product_id,
            quantity: item.quantity
        })))

    if (itemsError) return { success: false, error: itemsError.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function deleteRecurringOrder(id: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient() as any
    const { error } = await adminSupabase.from('recurring_orders').delete().eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function convertRecurringOrdersToReal() {
    // This action would be called by a cron job or manually for testing
    const adminSupabase = createAdminClient() as any

    // 1. Fetch all active recurring orders
    const { data: templates, error: fetchError } = await adminSupabase
        .from('recurring_orders')
        .select('*, recurring_order_items(*)')
        .eq('is_active', true)

    if (fetchError || !templates) {
        return { success: false, error: fetchError?.message || 'No templates found' }
    }

    // 2. Fetch current product prices
    const { data: products } = await adminSupabase.from('products').select('id, price')
    const priceMap = new Map((products as any[])?.map((p: any) => [p.id, p.price]))

    const results = []
    const weekData = getCustomWeekData(new Date())

    for (const template of templates) {
        // Create Order
        const { data: order, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                company_name: template.company_name,
                email: template.email,
                week_number: weekData.weekNumber,
                status: 'pending'
            })
            .select()
            .single()

        if (orderError) {
            results.push({ email: template.email, success: false, error: orderError.message })
            continue
        }

        // Create Items with price modifiers
        const itemsToInsert = template.recurring_order_items.map((item: any) => {
            const basePrice = (priceMap.get(item.product_id) as number) || 0
            const modifier = Number(template.price_modifier) || 0
            // Apply percentage modifier: basePrice * (1 + modifier / 100)
            const finalPrice = basePrice * (1 + modifier / 100)

            return {
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price_snapshot: Number(finalPrice.toFixed(2))
            }
        })

        const { error: itemsError } = await adminSupabase.from('order_items').insert(itemsToInsert)

        results.push({
            email: template.email,
            success: !itemsError,
            error: itemsError?.message
        })
    }

    revalidatePath('/admin')
    return { success: true, results }
}

export async function updateOrderItemQuantity(itemId: string, newQuantity: number) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient() as any

    const { error } = await adminSupabase
        .from('order_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

    if (error) {
        console.error('Update order item error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function updateOrderStatus(orderId: string, status: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient() as any

    const { error } = await adminSupabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

    if (error) {
        console.error('Update order status error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function updateStockLevels(updates: { id: string, stock_quantity: number }[]) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient() as any

    // For simplicity and safety, we'll do individual updates in a promise all
    const results = await Promise.all(updates.map(async (update) => {
        const { error } = await adminSupabase
            .from('products')
            .update({ stock_quantity: update.stock_quantity })
            .eq('id', update.id)

        return { id: update.id, success: !error, error }
    }))

    const failed = results.filter(r => !r.success)
    if (failed.length > 0) {
        console.error('Some stock updates failed:', failed)
        return { success: false, error: 'Sommige updates zijn mislukt' }
    }

    revalidatePath('/admin')
    revalidatePath('/shop')
    return { success: true }
}

export async function wakeUpDatabase() {
    const adminSupabase = createAdminClient() as any
    // Simple query to wake up the DB
    const { data, error } = await adminSupabase
        .from('products')
        .select('id')
        .limit(1)

    if (error) {
        console.error('Wake up database error:', error)
        return { success: false, error: error.message }
    }

    return { success: true, count: data?.length || 0 }
}
