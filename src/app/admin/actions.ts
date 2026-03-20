'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Database, Json, RecurringOrder, RecurringOrderItem } from '@/types'
import { cookies } from 'next/headers'
import { getCustomWeekData } from '@/lib/date-utils'

type ProductUpdate = Database['public']['Tables']['products']['Update']

export async function updateProduct(id: string, updates: ProductUpdate) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

const adminSupabase = createAdminClient()

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

const adminSupabase = createAdminClient()

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
    const adminSupabase = createAdminClient()
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

    const adminSupabase = createAdminClient()

    let orderId = order.id

    if (orderId) {
        // Update existing
        const { error: updateError } = await adminSupabase
            .from('recurring_orders')
            .update({
                company_name: order.company_name,
                email: order.email,
                price_modifier: order.price_modifier,
                is_active: order.is_active,
                interval: order.interval
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
                is_active: order.is_active ?? true,
                interval: order.interval || 'weekly'
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

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('recurring_orders').delete().eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function convertRecurringOrdersToReal() {
    // This action would be called by a cron job or manually for testing
    const adminSupabase = createAdminClient()

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
    const priceMap = new Map(products?.map(p => [p.id, p.price]) ?? [])

    const results: { email: string; success: boolean; error?: string }[] = []
    const weekData = getCustomWeekData(new Date())

    for (const template of templates) {
        // Skip if the interval doesn't match this week
        if (template.interval === 'bi-weekly') {
            if (weekData.weekNumber % 2 !== 0) continue
        } else if (template.interval === 'monthly') {
            const isLastWeek = (date: Date) => {
                const currentMonth = date.getMonth()
                const nextWeek = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
                return nextWeek.getMonth() !== currentMonth
            }
            if (!isLastWeek(weekData.weekStart)) continue
        } else if (template.interval === 'manual') {
            continue
        }

        // Create Order
        const { data: order, error: orderError } = await adminSupabase
            .from('orders')
            .insert({
                company_name: template.company_name,
                email: template.email,
                week_number: weekData.weekNumber,
                status: 'open'
            })
            .select()
            .single()

        if (orderError) {
            results.push({ email: template.email, success: false, error: orderError.message })
            continue
        }

        // Create Items with price modifiers
        const itemsToInsert = template.recurring_order_items.map((item: RecurringOrderItem) => {
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

export async function convertSingleRecurringOrderToReal(templateId: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()

    // 1. Fetch the specific recurring order template
    const { data: template, error: fetchError } = await adminSupabase
        .from('recurring_orders')
        .select('*, recurring_order_items(*)')
        .eq('id', templateId)
        .single()

    if (fetchError || !template) {
        return { success: false, error: fetchError?.message || 'Template not found' }
    }

    // 2. Fetch current product prices
    const { data: products } = await adminSupabase.from('products').select('id, price')
    const priceMap = new Map(products?.map(p => [p.id, p.price]) ?? [])

    const weekData = getCustomWeekData(new Date())

    // 3. Create Order
    const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .insert({
            company_name: template.company_name,
            email: template.email,
            week_number: weekData.weekNumber,
            status: 'open'
        })
        .select()
        .single()

    if (orderError) {
        return { success: false, error: orderError.message }
    }

    // 4. Create Items with price modifiers
    const itemsToInsert = template.recurring_order_items.map((item: RecurringOrderItem) => {
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

    if (itemsError) {
        // Cleanup order if items fail
        await adminSupabase.from('orders').delete().eq('id', order.id)
        return { success: false, error: itemsError.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function updateOrderItemQuantity(itemId: string, newQuantity?: number, newWeight?: number | null, newPrice?: number) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    console.log(`[AdminAction] Updating order item ${itemId}: qty=${newQuantity}, weight=${newWeight}, price=${newPrice}`)

    const adminSupabase = createAdminClient()

    const updates: Database['public']['Tables']['order_items']['Update'] = {}
    if (newQuantity !== undefined) updates.quantity = Math.round(newQuantity * 1000) / 1000
    if (newWeight !== undefined) {
        updates.actual_weight = newWeight === null ? null : Math.round(newWeight * 1000) / 1000
    }
    if (newPrice !== undefined) updates.price_snapshot = newPrice

    const { error } = await adminSupabase
        .from('order_items')
        .update(updates)
        .eq('id', itemId)

    if (error) {
        console.error('Update order item error:', error)
        return { success: false, error: error.message }
    }
    revalidatePath('/admin')
    return { success: true }
}

export async function toggleOrderItemCompletion(itemId: string, isCompleted: boolean) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('order_items')
        .update({ is_completed: isCompleted })
        .eq('id', itemId)

    if (error) {
        console.error('Toggle order item completion error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function updateOrderStatus(orderId: string, status: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()

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

export async function updateOrderMetadata(orderId: string, updates: { company_name?: string | null, email?: string | null, notes?: string | null, week_number?: number | null, created_at?: string }) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)

    if (error) {
        console.error('Update order metadata error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function addOrderItem(orderId: string, productId: string, quantity: number, priceSnapshot: number) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('order_items')
        .insert({
            order_id: orderId,
            product_id: productId,
            quantity: Math.round(quantity * 1000) / 1000,
            price_snapshot: priceSnapshot
        })

    if (error) {
        console.error('Add order item error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function removeOrderItem(itemId: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('order_items')
        .delete()
        .eq('id', itemId)

    if (error) {
        console.error('Remove order item error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function updateStockLevels(updates: { id: string, stock_quantity: number }[]) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()

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
    const adminSupabase = createAdminClient()
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

export async function deleteProduct(id: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('products')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Delete product error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    revalidatePath('/shop')
    return { success: true }
}

// STORE SETTINGS ACTIONS

export async function getStoreSettings(key: string) {
const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
        .from('store_settings')
        .select('value')
        .eq('key', key)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return { success: true, data: null } // Not found
        console.error('getStoreSettings error:', error)
        return { success: false, error: error.message }
    }
    return { success: true, data: data.value }
}

export async function updateStoreSettings(key: string, value: Json) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('store_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
        console.error('updateStoreSettings error:', error)
        return { success: false, error: error.message }
    }

    // Invalidate everything to ensure shop state updates immediately
    revalidatePath('/')
    revalidatePath('/admin')

    return { success: true }
}
export async function deleteOrder(id: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('orders')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Delete order error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function deleteInvoice(email: string, monthKey: string) {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()

    // Parse monthKey (YYYY-MM)
    const [year, month] = monthKey.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

    console.log(`[AdminAction] Deleting invoice for ${email} in ${monthKey} (${startDate} to ${endDate})`)

    const { error } = await adminSupabase
        .from('orders')
        .delete()
        .eq('email', email)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

    if (error) {
        console.error('Delete invoice error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
}
