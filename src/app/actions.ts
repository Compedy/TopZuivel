
'use server'

import { createClient } from '@/lib/supabase/server'
import { CartItem } from '@/components/ShopInterface'

export async function submitOrder(userId: string, cartItems: CartItem[]) {
    const supabase = await createClient()

    if (!userId || cartItems.length === 0) {
        return { success: false, error: 'Ongeldige bestelling' }
    }

    // 1. Create Order
    // We can determine week number here or let DB/Trigger handle it, but DB schema had it as column.
    // JS getWeek implementation:
    const getWeek = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }
    const currentWeek = getWeek(new Date())

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            week_number: currentWeek,
            status: 'pending'
        })
        .select()
        .single()

    if (orderError || !order) {
        console.error('Order creation failed:', orderError)
        return { success: false, error: 'Kon bestelling niet aanmaken' }
    }

    // 2. Create Order Items
    const itemsToInsert = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price_snapshot: item.product.price // Store base price
    }))

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

    if (itemsError) {
        console.error('Order items failed:', itemsError)
        // Ideally we should rollback here, but Supabase doesn't support transactions easily via JS client in one go without RPC
        // We could delete the order.
        await supabase.from('orders').delete().eq('id', order.id)
        return { success: false, error: 'Kon productregels niet opslaan' }
    }

    // 3. Send Email (Optional for now, but part of requirements)
    // We can trigger this via another function or here. 
    // For now, let's just return success.

    return { success: true, orderId: order.id }
}
