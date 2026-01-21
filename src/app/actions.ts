
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { CartItem } from '@/components/ShopInterface'
import { Resend } from 'resend'

export async function submitOrder(orderDetails: { companyName: string, email: string, cartItems: CartItem[] }) {
    // Use admin client to bypass RLS for public orders
    const supabase: any = createAdminClient()
    const { companyName, email, cartItems } = orderDetails

    if (!companyName || !email || cartItems.length === 0) {
        return { success: false, error: 'Ongeldige bestelling: Bedrijfsnaam en E-mail zijn verplicht.' }
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
            // user_id: null, // Explicitly null or omitted if DB default is null
            company_name: companyName,
            email: email,
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

    // 3. Send Email
    try {
        const adminEmail = process.env.ADMIN_EMAIL
        const fromEmail = process.env.FROM_EMAIL

        if (adminEmail && fromEmail) {
            const resend = new Resend(process.env.RESEND_API_KEY)

            // Generate HTML Table
            const rows = cartItems.map(item => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity} ${item.product.unit_label}</td>
                </tr>
            `).join('')

            const html = `
                <h1>Nieuwe Bestelling Ontvangen</h1>
                <p><strong>Bedrijf:</strong> ${companyName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Week:</strong> ${currentWeek}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f2f2f2; text-align: left;">
                            <th style="padding: 8px; border-bottom: 1px solid #ddd;">Product</th>
                            <th style="padding: 8px; border-bottom: 1px solid #ddd;">Aantal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `

            await resend.emails.send({
                from: fromEmail,
                to: adminEmail,
                subject: `Nieuwe Bestelling: ${companyName}`,
                html: html
            })
        } else {
            console.warn('ADMIN_EMAIL of FROM_EMAIL ontbreekt. Geen bevestigingsmail verstuurd.')
        }

    } catch (emailError) {
        console.error('Fout bij versturen e-mail:', emailError)
        // Don't fail the order if email fails, just log it
    }

    return { success: true, orderId: order.id }
}
