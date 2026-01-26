
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { groupOrdersByMonthAndCustomer, CustomerMonthlyTotal } from '@/lib/invoice-utils'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AdminInvoiceOverviewProps {
    products: Product[]
    orders: any[]
}

export default function AdminInvoiceOverview({ products, orders }: AdminInvoiceOverviewProps) {
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)

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
        const text = `
Factuurgegevens voor: ${customer.mostUsedCompanyName} (${customer.email})
Maand: ${formatMonthName(customer.month)}

Producten:
${customer.items.map(item => `- ${item.name}: ${item.quantity} ${item.unitLabel} @ ${formatPrice(item.priceAtSnapshot)} = ${formatPrice(item.totalLinePrice)}`).join('\n')}

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
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <div className="space-y-2">
                                                {customer.items.map(item => (
                                                    <div key={item.productId} className="flex justify-between text-sm">
                                                        <span>
                                                            <span className="font-medium">{item.quantity}×</span> {item.name}
                                                        </span>
                                                        <span className="text-muted-foreground">{formatPrice(item.totalLinePrice)}</span>
                                                    </div>
                                                ))}
                                                <div className="border-t pt-2 mt-4 flex justify-between font-bold">
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
        </div>
    )
}
