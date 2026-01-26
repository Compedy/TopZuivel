import { Product, OrderWithItems } from '@/types'

export interface CustomerMonthlyTotal {
    email: string
    mostUsedCompanyName: string
    month: string // YYYY-MM
    items: {
        productId: string
        name: string
        unitLabel: string
        quantity: number
        priceAtSnapshot: number
        totalLinePrice: number
    }[]
    grandTotal: number
}

export function groupOrdersByMonthAndCustomer(orders: OrderWithItems[], products: Product[]): Record<string, CustomerMonthlyTotal[]> {
    const months: Record<string, Record<string, any>> = {}

    orders.forEach(order => {
        const date = new Date(order.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const email = order.email || 'gast@topzuivel.nl'

        if (!months[monthKey]) months[monthKey] = {}
        if (!months[monthKey][email]) {
            months[monthKey][email] = {
                email: email,
                companyNames: {},
                orders: []
            }
        }

        months[monthKey][email].orders.push(order)
        const compName = order.company_name || 'Onbekend'
        months[monthKey][email].companyNames[compName] = (months[monthKey][email].companyNames[compName] || 0) + 1
    })

    const result: Record<string, CustomerMonthlyTotal[]> = {}

    Object.entries(months).forEach(([month, customers]) => {
        result[month] = Object.values(customers).map(customer => {
            // Find most used company name
            const mostUsedCompanyName = Object.entries(customer.companyNames as Record<string, number>)
                .reduce((a, b) => b[1] > a[1] ? b : a)[0]

            const itemTotals: Record<string, { quantity: number, price: number }> = {}

            customer.orders.forEach((order: OrderWithItems) => {
                order.order_items?.forEach((item) => {
                    const pid = item.product_id
                    if (!pid) return
                    if (!itemTotals[pid]) {
                        itemTotals[pid] = { quantity: 0, price: item.price_snapshot }
                    }
                    itemTotals[pid].quantity += item.quantity
                })
            })

            const items = products
                .filter(p => itemTotals[p.id])
                .map(p => {
                    const total = itemTotals[p.id]
                    return {
                        productId: p.id,
                        name: p.name,
                        unitLabel: p.unit_label,
                        quantity: total.quantity,
                        priceAtSnapshot: total.price,
                        totalLinePrice: total.quantity * total.price
                    }
                })

            const grandTotal = items.reduce((sum, item) => sum + item.totalLinePrice, 0)

            return {
                email: customer.email,
                mostUsedCompanyName,
                month,
                items,
                grandTotal
            }
        })
    })

    return result
}
