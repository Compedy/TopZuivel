
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Product, OrderWithItems, OrderItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCustomWeekData, groupOrdersByWeek } from '@/lib/date-utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminWeekOverviewProps {
    products: Product[]
    orders: OrderWithItems[]
}

type SummedProduct = Product & { totalQuantity: number }

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
            setExpandedWeeks((prev: Record<string, boolean>) => {
                if (Object.keys(prev).length === 0) {
                    return { [firstKey]: true };
                }
                return prev;
            })
        }
    }, [weekGroups])

    const toggleWeek = (key: string) => {
        setExpandedWeeks((prev: Record<string, boolean>) => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const calculateTotals = (weekOrders: OrderWithItems[]): SummedProduct[] => {
        const totals: Record<string, number> = {}

        weekOrders.forEach(order => {
            order.order_items?.forEach((item) => {
                const productId = item.product_id
                if (productId) {
                    const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                    const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)
                    // For piece based, we want the count of pieces
                    // For weight based (kg), quantity IS the weight
                    const amount = isPieceBased ? Math.round(item.quantity) : item.quantity
                    totals[productId] = (totals[productId] || 0) + amount
                }
            })
        })

        return products
            .filter(p => totals[p.id] && totals[p.id] > 0)
            .map(p => ({
                ...p,
                totalQuantity: totals[p.id]
            }))
    }

    return (
        <div className="space-y-4">
            {weekGroups.map((group: { weekData: any, orders: OrderWithItems[] }, index: number) => {
                const key = `${group.weekData.year}-W${group.weekData.weekNumber}`
                const isExpanded = !!expandedWeeks[key]
                const totals = calculateTotals(group.orders)
                const isCurrent = index === 0 &&
                    `${getCustomWeekData(new Date()).year}-W${getCustomWeekData(new Date()).weekNumber}` === key

                return (
                    <Card key={key} className={cn("overflow-hidden transition-all", isExpanded ? "ring-1 ring-primary/20" : "")}>
                        <CardHeader
                            className={cn(
                                "py-3 px-4 md:py-4 md:px-6 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 select-none",
                                isCurrent ? "bg-primary/5" : "bg-muted/10"
                            )}
                            onClick={() => toggleWeek(key)}
                        >
                            <div className="flex items-center gap-2 md:gap-3">
                                {isExpanded ? <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />}
                                <div className="flex flex-col">
                                    <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                                        {group.weekData.display}
                                        {isCurrent && <span className="text-[9px] md:text-[10px] bg-primary/20 text-primary px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wider">Huidig</span>}
                                    </CardTitle>
                                    <span className="text-[10px] md:text-xs text-muted-foreground">
                                        {group.orders.length} {group.orders.length === 1 ? 'bestelling' : 'bestellingen'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs md:text-sm font-medium text-muted-foreground">
                                {totals.length} {totals.length === 1 ? 'product' : 'producten'}
                            </div>
                        </CardHeader>
                        {isExpanded && (
                            <CardContent className="p-0 border-t">
                                {totals.length === 0 ? (
                                    <div className="p-6 md:p-8 text-center text-muted-foreground text-sm">
                                        Nog geen producten besteld in deze week.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        {(() => {
                                            const regularCheese = totals.filter(t => t.category === 'Kaas' && !t.name.toLowerCase().includes('gevacumeerd'))
                                            const prepackedCheese = totals.filter(t => t.category === 'Kaas' && t.name.toLowerCase().includes('gevacumeerd'))
                                            const zuivel = totals.filter(t => t.category === 'Zuivel')

                                            const sections = [
                                                { title: 'Reguliere Kaas', items: regularCheese },
                                                { title: 'Gevacumeerde Kaas', items: prepackedCheese },
                                                { title: 'Zuivel', items: zuivel }
                                            ]

                                            return sections.map((section: { title: string, items: SummedProduct[] }, sIndex: number) => {
                                                if (section.items.length === 0) return null

                                                return (
                                                    <div key={section.title} className={cn(sIndex > 0 ? "mt-4" : "")}>
                                                        <div className="bg-muted/40 px-4 py-1.5 md:px-6 md:py-2 flex items-center justify-between border-y">
                                                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">{section.title}</h4>
                                                            <span className="text-[9px] md:text-[10px] bg-background px-1.5 py-0.5 rounded border shadow-sm">
                                                                {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                                                            </span>
                                                        </div>
                                                        <table className="w-full text-sm">
                                                            <thead className="text-muted-foreground border-b text-[10px] md:text-xs uppercase">
                                                                <tr className="bg-background">
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-left font-bold">Product</th>
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-right font-bold w-[70px] md:w-[100px]">Totaal</th>
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-right font-bold w-[70px] md:w-[100px]">Vorraad</th>
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-right font-bold w-[70px] md:w-[100px]">Productie</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {section.items.map((product) => {
                                                                    const productionNeeded = Math.max(0, product.totalQuantity - (product.stock_quantity || 0))
                                                                    return (
                                                                        <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                                                                            <td className="py-2 px-4 md:py-2.5 md:px-6">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-semibold text-xs md:text-sm text-foreground">{product.name}</span>
                                                                                    <span className="text-[9px] md:text-[10px] text-muted-foreground">{product.type_group}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-2 px-4 md:py-2.5 md:px-6 text-right">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-mono font-bold text-sm md:text-lg">{product.totalQuantity}</span>
                                                                                    <span className="text-[9px] md:text-[10px] text-muted-foreground">{product.unit_label}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-2 px-4 md:py-2.5 md:px-6 text-right">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-mono text-xs md:text-sm text-muted-foreground/70">{product.stock_quantity || 0}</span>
                                                                                    <span className="text-[9px] md:text-[10px] text-muted-foreground/50">{product.unit_label}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-2 px-4 md:py-2.5 md:px-6 text-right bg-primary/5">
                                                                                <div className="flex flex-col">
                                                                                    <span className={cn(
                                                                                        "font-mono font-black text-sm md:text-lg",
                                                                                        productionNeeded > 0 ? "text-primary" : "text-muted-foreground/30"
                                                                                    )}>
                                                                                        {productionNeeded}
                                                                                    </span>
                                                                                    <span className="text-[9px] md:text-[10px] text-muted-foreground">{product.unit_label}</span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )
                                            })
                                        })()}
                                        <div className="bg-muted/5 p-2 px-4 md:px-6 text-[9px] md:text-[10px] text-muted-foreground italic border-t">
                                            Productie = Totaal Besteld - Huidige Voorraad (minimaal 0). Producten worden getoond in webshop-volgorde.
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                )
            })}
        </div>
    )
}
