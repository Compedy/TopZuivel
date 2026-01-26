
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Product, OrderWithItems } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCustomWeekData, groupOrdersByWeek } from '@/lib/date-utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminWeekOverviewProps {
    products: Product[]
    orders: OrderWithItems[]
}

export default function AdminWeekOverview({ products, orders }: AdminWeekOverviewProps) {
    const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({})

    const weekGroups = useMemo(() => {
        const groups = groupOrdersByWeek(orders)

        // Ensure current week is always at the top
        const currentWeekData = getCustomWeekData(new Date())
        const currentKey = `${currentWeekData.year}-W${currentWeekData.weekNumber}`

        const hasCurrentWeek = groups.some(g => {
            const gWeek = g.weekData
            return `${gWeek.year}-W${gWeek.weekNumber}` === currentKey
        })

        if (!hasCurrentWeek) {
            groups.unshift({
                weekData: currentWeekData,
                orders: []
            })
        } else {
            // Move current week to top if it's not already
            const currentIndex = groups.findIndex(g => {
                const gWeek = g.weekData
                return `${gWeek.year}-W${gWeek.weekNumber}` === currentKey
            })
            if (currentIndex > 0) {
                const [current] = groups.splice(currentIndex, 1)
                groups.unshift(current)
            }
        }



        return groups
    }, [orders])

    // Always expand the first week by default
    useEffect(() => {
        if (weekGroups.length > 0) {
            const firstKey = `${weekGroups[0].weekData.year}-W${weekGroups[0].weekData.weekNumber}`
            setExpandedWeeks(prev => {
                if (Object.keys(prev).length === 0) {
                    return { [firstKey]: true };
                }
                return prev;
            })
        }
    }, [weekGroups])

    const toggleWeek = (key: string) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const calculateTotals = (weekOrders: OrderWithItems[]) => {
        const totals: Record<string, number> = {}

        weekOrders.forEach(order => {
            order.order_items?.forEach((item) => {
                const productId = item.product_id
                if (productId) {
                    totals[productId] = (totals[productId] || 0) + item.quantity
                }
            })
        })

        // Map to products and filter out 0 quantity
        return products
            .filter(p => totals[p.id] && totals[p.id] > 0)
            .map(p => ({
                ...p,
                totalQuantity: totals[p.id]
            }))
    }

    return (
        <div className="space-y-4">
            {weekGroups.map((group, index) => {
                const key = `${group.weekData.year}-W${group.weekData.weekNumber}`
                const isExpanded = !!expandedWeeks[key]
                const totals = calculateTotals(group.orders)
                const isCurrent = index === 0 &&
                    `${getCustomWeekData(new Date()).year}-W${getCustomWeekData(new Date()).weekNumber}` === key

                return (
                    <Card key={key} className={cn("overflow-hidden transition-all", isExpanded ? "ring-1 ring-primary/20" : "")}>
                        <CardHeader
                            className={cn(
                                "py-4 px-6 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 select-none",
                                isCurrent ? "bg-primary/5" : "bg-muted/10"
                            )}
                            onClick={() => toggleWeek(key)}
                        >
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                <div className="flex flex-col">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        {group.weekData.display}
                                        {isCurrent && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">Huidig</span>}
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground">
                                        {group.orders.length} {group.orders.length === 1 ? 'bestelling' : 'bestellingen'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                                {totals.length} {totals.length === 1 ? 'product' : 'producten'}
                            </div>
                        </CardHeader>
                        {isExpanded && (
                            <CardContent className="p-0 border-t">
                                {totals.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        Nog geen producten besteld in deze week.
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/20 text-muted-foreground">
                                            <tr>
                                                <th className="py-2.5 px-6 text-left font-semibold">Product</th>
                                                <th className="py-2.5 px-6 text-right font-semibold">Totaal Aantal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {totals.map(product => (
                                                <tr key={product.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="py-3 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{product.name}</span>
                                                            <span className="text-xs text-muted-foreground">{product.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-6 text-right font-mono font-bold text-lg">
                                                        {product.totalQuantity} <span className="text-xs font-normal text-muted-foreground">{product.unit_label}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/5">
                                            <tr>
                                                <td colSpan={2} className="py-2 px-6 text-[10px] text-muted-foreground italic">
                                                    Producten worden getoond in de webshop-volgorde.
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </CardContent>
                        )}
                    </Card>
                )
            })}
        </div>
    )
}
