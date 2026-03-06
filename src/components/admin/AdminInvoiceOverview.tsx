
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { groupOrdersByMonthAndCustomer, CustomerMonthlyTotal } from '@/lib/invoice-utils'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import OrderEditor from './OrderEditor'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { OrderWithItems } from '@/types'

interface AdminInvoiceOverviewProps {
    products: Product[]
    orders: any[]
}

export default function AdminInvoiceOverview({ products, orders }: AdminInvoiceOverviewProps) {
    const router = useRouter()
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [orderToEdit, setOrderToEdit] = useState<OrderWithItems | null>(null)

    const monthlyData = useMemo(() => {
        const grouped = groupOrdersByMonthAndCustomer(orders, products)
        const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

        // Auto-expand current month
        if (sortedMonths.length > 0 && Object.keys(expandedMonths).length === 0) {
            setExpandedMonths({ [sortedMonths[0]]: true })
        }

        return { grouped, sortedMonths }
    }, [orders, products])

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }))
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
    }

    const formatMonthName = (monthKey: string) => {
        const [year, month] = monthKey.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    }

    const copyToClipboard = (customer: CustomerMonthlyTotal) => {
        let itemsText = ""
        customer.orders.forEach(order => {
            itemsText += `\nOrder #${order.order_number} (${new Date(order.created_at).toLocaleDateString('nl-NL')}):\n`
            order.order_items?.forEach(item => {
                const isPieceBased = ['st', 'stuk', 'blok'].includes(item.products?.unit_label?.toLowerCase() || '')
                const stdWeight = item.products?.weight_per_unit || 0
                const weight = item.actual_weight !== null ? item.actual_weight : (item.quantity * stdWeight)
                const isPricePerKilo = item.products?.is_price_per_kilo
                const linePrice = (isPieceBased && !isPricePerKilo) ? item.quantity * item.price_snapshot : weight * item.price_snapshot

                let qtyStr = `${item.quantity} ${item.products?.unit_label}`
                if (isPieceBased && (item.actual_weight !== null || (isPricePerKilo && stdWeight > 0))) {
                    qtyStr += ` (${weight.toFixed(2)} kg)`
                }

                itemsText += `- ${qtyStr} ${item.products?.name} @ ${formatPrice(item.price_snapshot)} = ${formatPrice(linePrice)}\n`
            })
        })

        const text = `
Factuurgegevens voor: ${customer.mostUsedCompanyName} (${customer.email})
Maand: ${formatMonthName(customer.month)}
${itemsText}
Totaal: ${formatPrice(customer.grandTotal)}
        `.trim()

        navigator.clipboard.writeText(text)
        const id = `${customer.month}-${customer.email}`
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="space-y-6">
            {monthlyData.sortedMonths.map(month => (
                <div key={month} className="space-y-4">
                    <div
                        className="flex items-center gap-2 cursor-pointer select-none group"
                        onClick={() => toggleMonth(month)}
                    >
                        {expandedMonths[month] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <h2 className="text-xl font-bold capitalize group-hover:text-primary transition-colors">
                            {formatMonthName(month)}
                        </h2>
                        <span className="text-sm text-muted-foreground ml-2">
                            ({monthlyData.grouped[month].length} klanten)
                        </span>
                        <div className="ml-auto text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                            Totaal: {formatPrice(monthlyData.grouped[month].reduce((sum, c) => sum + c.grandTotal, 0))}
                        </div>
                    </div>

                    {expandedMonths[month] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                            {monthlyData.grouped[month].map(customer => {
                                const id = `${month}-${customer.email}`
                                return (
                                    <Card key={id} className="relative overflow-hidden group">
                                        <CardHeader className="pb-2 bg-muted/30">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg">{customer.mostUsedCompanyName}</CardTitle>
                                                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => copyToClipboard(customer)}
                                                >
                                                    {copiedId === id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {customer.orders.map(order => (
                                                    <Button
                                                        key={order.id}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[10px] gap-1"
                                                        onClick={() => {
                                                            setOrderToEdit(order)
                                                            setIsEditorOpen(true)
                                                        }}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                        Order #{order.order_number}
                                                    </Button>
                                                ))}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="space-y-6">
                                                {customer.orders.map(order => {
                                                    let orderTotal = 0
                                                    return (
                                                        <div key={order.id} className="space-y-2 border-b last:border-0 pb-4 last:pb-0">
                                                            <div className="flex justify-between items-center bg-muted/20 p-2 rounded">
                                                                <span className="text-xs font-bold text-muted-foreground uppercase">Order #{order.order_number}</span>
                                                                <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('nl-NL')}</span>
                                                            </div>
                                                            <div className="space-y-1.5 pl-2">
                                                                {order.order_items?.map(item => {
                                                                    const isPieceBased = ['st', 'stuk', 'blok'].includes(item.products?.unit_label?.toLowerCase() || '')
                                                                    const isPricePerKilo = item.products?.is_price_per_kilo
                                                                    const stdWeight = item.products?.weight_per_unit || 0

                                                                    let linePrice = 0
                                                                    let displayQty = ""

                                                                    if (isPieceBased) {
                                                                        const weight = item.actual_weight !== null ? item.actual_weight : (item.quantity * stdWeight)
                                                                        linePrice = isPricePerKilo ? weight * item.price_snapshot : item.quantity * item.price_snapshot
                                                                        displayQty = `${item.quantity} ${item.products?.unit_label}`
                                                                        if (item.actual_weight !== null || (isPricePerKilo && stdWeight > 0)) {
                                                                            displayQty += ` (${weight.toFixed(2)} kg)`
                                                                        }
                                                                    } else {
                                                                        linePrice = item.quantity * item.price_snapshot
                                                                        displayQty = `${item.quantity.toFixed(2)} ${item.products?.unit_label}`
                                                                    }

                                                                    orderTotal += linePrice

                                                                    return (
                                                                        <div key={item.id} className="flex justify-between text-xs items-baseline">
                                                                            <span className="flex-1 mr-4">
                                                                                <span className="font-medium">{displayQty}</span> {item.products?.name}
                                                                                <span className="text-[10px] text-muted-foreground ml-1">@ {formatPrice(item.price_snapshot)}</span>
                                                                            </span>
                                                                            <span className="text-muted-foreground font-mono">{formatPrice(linePrice)}</span>
                                                                        </div>
                                                                    )
                                                                })}
                                                                <div className="flex justify-end pt-1">
                                                                    <span className="text-[10px] font-bold">Subtotaal: {formatPrice(orderTotal)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                <div className="border-t pt-3 mt-2 flex justify-between font-bold text-base">
                                                    <span>Maand Totaal</span>
                                                    <span className="text-primary">{formatPrice(customer.grandTotal)}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}

            {monthlyData.sortedMonths.length === 0 && (
                <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    Geen bestellingen gevonden voor facturatie.
                </div>
            )}

            {orderToEdit && (
                <OrderEditor
                    open={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    order={orderToEdit}
                    products={products}
                    onSuccess={() => {
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}
