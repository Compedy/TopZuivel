import { Product, OrderWithItems } from '@/types'

export interface CustomerMonthlyTotal {
    email: string
    mostUsedCompanyName: string
    month: string // YYYY-MM
    grandTotal: number
    orders: OrderWithItems[]
}

interface CustomerAccumulator {
    email: string
    companyNames: Record<string, number>
    orders: OrderWithItems[]
}

export function groupOrdersByMonthAndCustomer(orders: OrderWithItems[], products: Product[]): Record<string, CustomerMonthlyTotal[]> {
    const months: Record<string, Record<string, CustomerAccumulator>> = {}

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
            const mostUsedCompanyName = Object.entries(customer.companyNames)
                .reduce((a, b) => b[1] > a[1] ? b : a)[0]

            let grandTotal = 0
            customer.orders.forEach((order: OrderWithItems) => {
                order.order_items?.forEach((item) => {
                    const isPieceBased = ['st', 'stuk', 'blok'].includes(item.products?.unit_label?.toLowerCase() || '')
                    let linePrice = 0
                    const price = item.price_snapshot

                    if (isPieceBased) {
                        const stdWeight = item.products?.weight_per_unit || 0
                        const isPricePerKilo = item.products?.is_price_per_kilo

                        if (isPricePerKilo) {
                            const weight = item.actual_weight !== null ? item.actual_weight : (item.quantity * stdWeight)
                            linePrice = weight * price
                        } else {
                            linePrice = item.quantity * price
                        }
                    } else {
                        linePrice = item.quantity * price // quantity is weight for kg
                    }
                    grandTotal += linePrice
                })
            })

            return {
                email: customer.email,
                mostUsedCompanyName,
                month,
                grandTotal,
                orders: customer.orders
            }
        })
    })

    return result
}
