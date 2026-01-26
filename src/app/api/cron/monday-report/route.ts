
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  // 1. Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 1. Haal de mail op
  const adminEmail = process.env.ADMIN_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;

  // 2. Check of hij bestaat. Zo niet? Stop direct.
  if (!adminEmail || !fromEmail) {
    return Response.json({ error: 'ADMIN_EMAIL of FROM_EMAIL is niet ingesteld in Vercel!' }, { status: 500 });
  }

  const supabase = await createClient()

  // 2. Fetch Orders from Last 7 Days (or just fetch all 'pending' and mark them done?) 
  // Requirement says "orders from the last 7 days". 
  // Let's assume we want recently created orders.

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      products (
        name,
        type_group,
        unit_label,
        weight_per_unit,
        is_price_per_kilo
      ),
      orders (
         created_at,
         company_name
      )
    `)
    .gte('orders.created_at', sevenDaysAgo.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!orderItems || orderItems.length === 0) {
    return NextResponse.json({ message: 'No orders found' })
  }

  // 3. Process Data

  // Section 1: Packing List (Sum quantity grouped by Product Name)
  const packingList: Record<string, { quantity: number, unit: string }> = {}

  // Section 2: Production Sheet (Sum weight grouped by Type Group)
  const productionSheet: Record<string, number> = {}

  orderItems.forEach((item: any) => {
    const product = item.products
    const qty = item.quantity

    // Packing List
    if (!packingList[product.name]) {
      packingList[product.name] = { quantity: 0, unit: product.unit_label }
    }
    packingList[product.name].quantity += qty

    // Production Sheet
    if (!productionSheet[product.type_group]) {
      productionSheet[product.type_group] = 0
    }

    // Logic: Sum of (quantity * weight_per_unit)
    productionSheet[product.type_group] += (qty * product.weight_per_unit)
  })

  // 4. Generate Email HTML
  const html = `
    <h1>Top Zuivel - Maandrapportage</h1>
    <p>Periode: ${sevenDaysAgo.toLocaleDateString('nl-NL')} t/m ${new Date().toLocaleDateString('nl-NL')}</p>
    
    <h2>1. Paklijst (Totaal per Product)</h2>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th>Product</th>
          <th>Aantal</th>
          <th>Eenheid</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(packingList).sort().map(([name, data]) => `
          <tr>
            <td>${name}</td>
            <td>${data.quantity}</td>
            <td>${data.unit}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>2. Productielijst (Totaal gewicht per Type)</h2>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th>Type Groep</th>
          <th>Totaal Gewicht (kg)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(productionSheet).sort().map(([type, weight]) => `
          <tr>
            <td>${type}</td>
            <td>${weight.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `

  // 5. Send Email
  try {
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail, // Needs to be a verified domain
      to: [adminEmail], // Admin email
      replyTo: adminEmail,
      subject: `Weekorder Rapportage - Week ${getWeekNumber(new Date())}`,
      html: html,
    })

    if (emailError) {
      console.error('Email failed:', emailError)
      return NextResponse.json({ error: 'Email failed', details: emailError }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Report sent', emailId: emailData?.id })
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error', details: e }, { status: 500 })
  }
}

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
