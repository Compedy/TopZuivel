
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types'
import { CartItem } from '@/components/ShopInterface'
import { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { OrderSubmissionSchema } from '@/lib/schemas'
import { env } from '@/lib/env'

export async function submitOrder(orderDetails: { companyName: string, email: string, cartItems: CartItem[], notes?: string }) {
    // 0. Validate input
    const validated = OrderSubmissionSchema.safeParse(orderDetails)
    if (!validated.success) {
        return {
            success: false,
            error: `Ongeldige bestelling: ${validated.error.issues.map(i => i.message).join(', ')}`
        }
    }
    const { companyName, email, cartItems, notes } = validated.data

    // Use admin client to bypass RLS for public orders
    const supabase: SupabaseClient<Database> = createAdminClient()

    // 1. Calculate Delivery Week (Week n+1)
    const getWeek = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }

    // Add 7 days to current date to get the delivery week
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + 7)
    const deliveryWeek = getWeek(deliveryDate)

    const { data: order, error: orderError } = await (supabase
        .from('orders')
        .insert({
            company_name: companyName,
            email: email,
            week_number: deliveryWeek,
            status: 'open',
            notes: notes || null
        })
        .select()
        .single() as any)

    if (orderError || !order) {
        console.error('Order creation failed:', orderError)
        return { success: false, error: 'Kon bestelling niet aanmaken: ' + (orderError?.message || 'Onbekende fout') }
    }

    // 2. Create Order Items
    const itemsToInsert = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price_snapshot: item.product.price // Store base price
    }))

    const { error: itemsError } = await (supabase
        .from('order_items')
        .insert(itemsToInsert))

    if (itemsError) {
        console.error('Order items failed:', itemsError)
        // Ideally we should rollback here, but Supabase doesn't support transactions easily via JS client in one go without RPC
        // We could delete the order.
        await supabase.from('orders').delete().eq('id', order.id)
        return { success: false, error: 'Kon productregels niet opslaan' }
    }

    // 3. Send Email
    try {
        const adminEmail = env.ADMIN_EMAIL
        const fromEmail = env.FROM_EMAIL

        if (adminEmail && fromEmail) {
            const resend = new Resend(env.RESEND_API_KEY)

            // Generate HTML Table for Admin
            const rows = cartItems.map(item => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity} ${item.product.unit_label}</td>
                </tr>
            `).join('')

            const adminHtml = `
                <h1>Nieuwe Bestelling #${order.order_number} Ontvangen</h1>
                <p><strong>Ordernummer:</strong> #${order.order_number}</p>
                <p><strong>Bedrijf:</strong> ${companyName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Leverweek:</strong> ${deliveryWeek}</p>
                ${notes ? `<p><strong>Opmerking:</strong> ${notes}</p>` : ''}
                
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

            // 1. Send to Admin
            await resend.emails.send({
                from: `Top Zuivel <${fromEmail}>`,
                to: adminEmail,
                replyTo: adminEmail, // As requested: reply-to should be admin-email
                subject: `Nieuwe Bestelling #${order.order_number} (Leverweek ${deliveryWeek}): ${companyName}`,
                html: adminHtml
            })

            // 2. Send Confirmation to User
            const userHtml = `
                <h1>Bevestiging van uw bestelling #${order.order_number}</h1>
                <p>Beste relatie,</p>
                <p>Bedankt voor uw bestelling bij Top Zuivel. Hieronder vindt u een overzicht van uw bestelling die zal worden geleverd in <strong>week ${deliveryWeek}</strong>.</p>
                ${notes ? `<p><strong>Uw opmerking:</strong> ${notes}</p>` : ''}
                
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
                
                <p>Met vriendelijke groet,<br>Top Zuivel</p>
            `

            await resend.emails.send({
                from: `Top Zuivel <${fromEmail}>`,
                to: email, // Send to customer
                replyTo: adminEmail,
                subject: `Bevestiging Bestelling #${order.order_number} Leverweek ${deliveryWeek} - Top Zuivel`,
                html: userHtml
            })

        } else {
            console.warn('ADMIN_EMAIL of FROM_EMAIL ontbreekt. Geen e-mails verstuurd.')
        }

    } catch (emailError) {
        console.error('Fout bij versturen e-mail:', emailError)
        // Don't fail the order if email fails, just log it
    }

    return { success: true, orderId: order.id, orderNumber: order.order_number }
}

export async function adminLogin(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (
        username === env.ADMIN_USERNAME &&
        password === env.ADMIN_PASSWORD
    ) {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()

        cookieStore.set('admin_session', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/'
        })

        return { success: true }
    }

    return { success: false, error: 'Ongeldige inloggegevens' }
}

export async function adminLogout() {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
}
