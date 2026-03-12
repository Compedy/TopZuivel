
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Product, OrderWithItems, OrderItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCustomWeekData, groupOrdersByWeek } from '@/lib/date-utils'
import { ChevronDown, ChevronRight, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sortProducts } from '@/lib/product-sorting'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AdminWeekOverviewProps {
    products: Product[]
    orders: OrderWithItems[]
}

type SummedProduct = Product & {
    totalQuantity: number,
    totalWeight: number
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
            groups.push({
                weekData: currentWeekData,
                orders: []
            })
        }

        // Always sort by week start descending to ensure future weeks are on top
        return groups.sort((a, b) => b.weekData.weekStart.getTime() - a.weekData.weekStart.getTime())
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

    const exportToPDF = (group: { weekData: any, orders: OrderWithItems[] }) => {
        const totals = calculateTotals(group.orders)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
        })

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(`Productie Overzicht - ${group.weekData.display}`, 10, 15)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Totaal bestellingen: ${group.orders.length}`, 10, 22)

        const regularCheese = totals.filter(t => t.category === 'Kaas' && !t.name.toLowerCase().includes('gevacumeerd'))
        const prepackedCheese = totals.filter(t => t.category === 'Kaas' && t.name.toLowerCase().includes('gevacumeerd'))
        const zuivel = totals.filter(t => t.category === 'Zuivel')

        const allItems = [
            ...regularCheese,
            ...prepackedCheese,
            ...zuivel
        ]

        // Split into two columns if many items
        const useTwoColumns = allItems.length > 25
        const body = allItems.map(p => {
            const productionNeeded = Math.max(0, p.totalQuantity - (p.stock_quantity || 0))
            return [
                p.name,
                `${p.totalQuantity} ${p.unit_label}`,
                `${p.totalWeight.toFixed(1)} kg`,
                `${productionNeeded} ${p.unit_label}`
            ]
        })

        if (useTwoColumns) {
            const midpoint = Math.ceil(body.length / 2)
            const leftCol = body.slice(0, midpoint)
            const rightCol = body.slice(midpoint)

            // Left table
            autoTable(doc, {
                startY: 30,
                margin: { right: 74, left: 10 },
                head: [['Product', 'Totaal', 'Kg', 'Prod']],
                body: leftCol,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1 },
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 15, halign: 'right' },
                    2: { cellWidth: 12, halign: 'right' },
                    3: { cellWidth: 12, halign: 'right', fontStyle: 'bold' }
                }
            })

            // Right table
            autoTable(doc, {
                startY: 30,
                margin: { left: 74, right: 10 },
                head: [['Product', 'Totaal', 'Kg', 'Prod']],
                body: rightCol,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1 },
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 15, halign: 'right' },
                    2: { cellWidth: 12, halign: 'right' },
                    3: { cellWidth: 12, halign: 'right', fontStyle: 'bold' }
                }
            })
        } else {
            autoTable(doc, {
                startY: 30,
                head: [['Product', 'Totaal Besteld', 'Gewicht', 'Voorraad', 'Productie']],
                body: allItems.map(p => [
                    p.name,
                    `${p.totalQuantity} ${p.unit_label}`,
                    `${p.totalWeight.toFixed(2)} kg`,
                    `${p.stock_quantity || 0} ${p.unit_label}`,
                    `${Math.max(0, p.totalQuantity - (p.stock_quantity || 0))} ${p.unit_label}`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' }
                }
            })
        }

        doc.save(`TopZuivel_Overzicht_${group.weekData.year}_W${group.weekData.weekNumber}.pdf`)
    }

    const calculateTotals = (weekOrders: OrderWithItems[]): SummedProduct[] => {
        const itemTotals: Record<string, { quantity: number, weight: number }> = {}

        weekOrders.forEach(order => {
            order.order_items?.forEach((item) => {
                const productId = item.product_id
                if (productId) {
                    const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                    const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)
                    const standardWeight = item.products?.weight_per_unit || 1

                    const amount = isPieceBased ? Math.round(item.quantity) : item.quantity
                    const weight = item.actual_weight ?? (item.quantity * standardWeight)

                    if (!itemTotals[productId]) {
                        itemTotals[productId] = { quantity: 0, weight: 0 }
                    }

                    itemTotals[productId].quantity += amount
                    itemTotals[productId].weight += weight
                }
            })
        })

        return sortProducts(
            products
                .filter(p => itemTotals[p.id] && itemTotals[p.id].quantity > 0)
                .map(p => ({
                    ...p,
                    totalQuantity: itemTotals[p.id].quantity,
                    totalWeight: itemTotals[p.id].weight
                }))
        )
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
                            <div className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2 bg-background hover:bg-primary/5 border-primary/20"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        exportToPDF(group)
                                    }}
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    <span>Print Overzicht</span>
                                </Button>
                                <div className="hidden sm:block">
                                    {totals.length} {totals.length === 1 ? 'product' : 'producten'}
                                </div>
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

                                                // Aggregation logic for vacuumed products
                                                const isVacuumed = section.title === 'Gevacumeerde Kaas'
                                                const aggregation: Record<string, number> = {}
                                                if (isVacuumed) {
                                                    section.items.forEach(p => {
                                                        const baseName = p.name
                                                            .replace(/\s*\d+\s*(gram|gr|g|kg|kilo)\s*/gi, ' ')
                                                            .replace(/\(gevacumeerd\)/gi, 'gevacumeerd')
                                                            .replace(/\bgevacumeerd\b/gi, 'Gevacumeerd')
                                                            .replace(/\s+/g, ' ')
                                                            .trim()
                                                        const productionUnits = Math.max(0, p.totalQuantity - (p.stock_quantity || 0))
                                                        const weight = productionUnits * (p.weight_per_unit || 0)
                                                        aggregation[baseName] = (aggregation[baseName] || 0) + weight
                                                    })
                                                }

                                                return (
                                                    <div key={section.title} className={cn(sIndex > 0 ? "mt-4" : "")}>
                                                        <div className="bg-muted/40 px-4 py-1.5 md:px-6 md:py-2 flex items-center justify-between border-y">
                                                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground">{section.title}</h4>
                                                            <span className="text-[9px] md:text-[10px] bg-background px-1.5 py-0.5 rounded border shadow-sm">
                                                                {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                                                            </span>
                                                        </div>

                                                        {isVacuumed && Object.keys(aggregation).length > 0 && (
                                                            <div className="px-4 py-3 md:px-6 md:py-4 bg-primary/5 border-b space-y-2">
                                                                <h5 className="text-[10px] font-bold uppercase text-primary/60">Productie Totaal (Gewicht)</h5>
                                                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                                    {Object.entries(aggregation).map(([name, weight]) => (
                                                                        <div key={name} className="flex items-baseline gap-2">
                                                                            <span className="text-xs font-semibold">{name}:</span>
                                                                            <span className="text-sm font-black text-primary">{weight.toFixed(2)} kg</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <table className="w-full text-sm">
                                                            <thead className="text-muted-foreground border-b text-[10px] md:text-xs uppercase">
                                                                <tr className="bg-background">
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-left font-bold">Product</th>
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-right font-bold w-[70px] md:w-[100px]">Totaal</th>
                                                                    <th className="py-2 px-4 md:py-2 md:px-6 text-right font-bold w-[70px] md:w-[100px]">Voorraad</th>
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
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-2 px-4 md:py-2.5 md:px-6 text-right">
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-baseline justify-end gap-1">
                                                                                        <span className="font-mono font-bold text-sm md:text-lg">{product.totalQuantity}</span>
                                                                                        <span className="text-[9px] md:text-[10px] text-muted-foreground">{product.unit_label}</span>
                                                                                    </div>
                                                                                    <span className="text-[10px] md:text-xs font-black text-primary">
                                                                                        {product.totalWeight.toFixed(2)} kg
                                                                                    </span>
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
                                                                                    <div className="flex items-baseline justify-end gap-1">
                                                                                        <span className={cn(
                                                                                            "font-mono font-black text-sm md:text-lg",
                                                                                            productionNeeded > 0 ? "text-primary" : "text-muted-foreground/30"
                                                                                        )}>
                                                                                            {productionNeeded}
                                                                                        </span>
                                                                                        <span className="text-[9px] md:text-[10px] text-muted-foreground">{product.unit_label}</span>
                                                                                    </div>
                                                                                    {productionNeeded > 0 && product.weight_per_unit && (
                                                                                        <span className="text-[10px] md:text-xs font-black text-orange-600">
                                                                                            {(productionNeeded * product.weight_per_unit).toFixed(2)} kg
                                                                                        </span>
                                                                                    )}
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
