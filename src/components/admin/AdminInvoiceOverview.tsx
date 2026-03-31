
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { groupOrdersByMonthAndCustomer, CustomerMonthlyTotal } from '@/lib/invoice-utils'
import { ChevronDown, ChevronRight, Check, Pencil, Trash2, Loader2, Search, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import OrderEditor from './OrderEditor'
import { useRouter } from 'next/navigation'
import { deleteInvoice, deleteOrder, markOrdersAsInvoiced } from '@/app/admin/actions'
import { OrderWithItems } from '@/types'
import { toast } from 'sonner'
import { generateOrderPDF } from '@/lib/pdf-utils'

interface AdminInvoiceOverviewProps {
    products: Product[]
    orders: OrderWithItems[]
}

export default function AdminInvoiceOverview({ products, orders }: AdminInvoiceOverviewProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [showInvoiced, setShowInvoiced] = useState(false)
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [orderToEdit, setOrderToEdit] = useState<OrderWithItems | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null)
    const [isMarkingInvoiced, setIsMarkingInvoiced] = useState<string | null>(null)
    const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)

    const visibleOrders = useMemo(
        () => (showInvoiced ? orders : orders.filter(o => !o.is_invoiced)),
        [orders, showInvoiced]
    )

    const monthlyData = useMemo(() => {
        const grouped = groupOrdersByMonthAndCustomer(visibleOrders, products)
        const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

        if (sortedMonths.length > 0 && Object.keys(expandedMonths).length === 0) {
            setExpandedMonths({ [sortedMonths[0]]: true })
        }

        return { grouped, sortedMonths }
    }, [visibleOrders, products])

    // For counts in the month header — total customers before search filter
    const allMonthlyData = useMemo(
        () => groupOrdersByMonthAndCustomer(visibleOrders, products),
        [visibleOrders, products]
    )

    const filteredData = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return monthlyData

        const filtered: typeof monthlyData.grouped = {}
        for (const month of monthlyData.sortedMonths) {
            const matches = monthlyData.grouped[month].filter(c =>
                c.mostUsedCompanyName.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q)
            )
            if (matches.length > 0) filtered[month] = matches
        }
        return { grouped: filtered, sortedMonths: monthlyData.sortedMonths.filter(m => filtered[m]) }
    }, [monthlyData, searchQuery])

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }))
    }

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)

    const formatMonthName = (monthKey: string) => {
        const [year, month] = monthKey.split('-')
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    }

    const handleMarkInvoiced = async (customer: CustomerMonthlyTotal) => {
        const id = `${customer.month}-${customer.email}`
        setIsMarkingInvoiced(id)
        const orderIds = customer.orders.map(o => o.id)
        const result = await markOrdersAsInvoiced(orderIds)
        setIsMarkingInvoiced(null)
        if (result.success) {
            router.refresh()
        } else {
            toast.error('Fout bij markeren als gefactureerd: ' + result.error)
        }
    }

    const handleDeleteInvoice = async (customer: CustomerMonthlyTotal) => {
        const confirmMsg = `Weet u zeker dat u de volledige factuur voor ${customer.mostUsedCompanyName} (${formatMonthName(customer.month)}) wilt verwijderen?\n\nHiermee worden ALLE ${customer.orders.length} onderliggende bestellingen permanent verwijderd!`
        if (!confirm(confirmMsg)) return

        const deleteId = `${customer.month}-${customer.email}`
        setIsDeleting(deleteId)
        const result = await deleteInvoice(customer.email, customer.month)
        setIsDeleting(null)

        if (result.success) {
            router.refresh()
        } else {
            toast.error('Fout bij verwijderen factuur: ' + result.error)
        }
    }

    const handleDeleteOrder = async (e: React.MouseEvent, order: OrderWithItems) => {
        e.stopPropagation()
        if (!confirm(`Weet u zeker dat u order #${order.order_number} wilt verwijderen?`)) return

        setIsDeletingOrder(order.id)
        const result = await deleteOrder(order.id)
        setIsDeletingOrder(null)

        if (result.success) {
            router.refresh()
        } else {
            toast.error('Fout bij verwijderen order: ' + result.error)
        }
    }

    const handleGeneratePDF = async (e: React.MouseEvent, order: OrderWithItems) => {
        e.stopPropagation()
        setGeneratingPDF(order.id)
        try {
            await generateOrderPDF(order)
        } catch {
            toast.error('Fout bij het genereren van de PDF.')
        } finally {
            setGeneratingPDF(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Zoek op klant of email..."
                        className="pl-8 h-9 text-xs"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Switch
                        id="show-invoiced"
                        checked={showInvoiced}
                        onCheckedChange={setShowInvoiced}
                    />
                    <Label htmlFor="show-invoiced" className="text-sm text-muted-foreground whitespace-nowrap">Toon gefactureerd</Label>
                </div>
            </div>

            {filteredData.sortedMonths.map(month => {
                const customers = filteredData.grouped[month]
                const totalCustomers = allMonthlyData[month]?.length ?? customers.length
                const matchCount = customers.length
                const monthTotal = customers.reduce((sum, c) => sum + c.grandTotal, 0)
                return (
                    <div key={month} className="space-y-4">
                        <div
                            className="flex items-center gap-2 cursor-pointer select-none group border-b pb-2"
                            onClick={() => toggleMonth(month)}
                        >
                            {expandedMonths[month]
                                ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                            <h2 className="text-xl font-bold capitalize group-hover:text-primary transition-colors">
                                {formatMonthName(month)}
                            </h2>
                            <span className="text-sm text-muted-foreground ml-2">
                                {searchQuery.trim()
                                    ? `(${matchCount} van ${totalCustomers} klanten)`
                                    : `(${totalCustomers} klanten)`}
                            </span>
                            <div className="ml-auto text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                                Totaal: {formatPrice(monthTotal)}
                            </div>
                        </div>

                        {expandedMonths[month] && (
                            <div className="columns-1 md:columns-2 gap-4 pl-6 space-y-4 md:space-y-0">
                                {customers.map(customer => {
                                    const id = `${month}-${customer.email}`
                                    const allInvoiced = customer.orders.every(o => o.is_invoiced)
                                    return (
                                        <Card key={id} className="relative overflow-hidden mb-4 break-inside-avoid shadow-sm hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-2 bg-muted/30">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="min-w-0">
                                                        <CardTitle className="text-lg truncate">{customer.mostUsedCompanyName}</CardTitle>
                                                        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {!allInvoiced && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                                                onClick={() => handleMarkInvoiced(customer)}
                                                                disabled={isMarkingInvoiced === id}
                                                            >
                                                                {isMarkingInvoiced === id
                                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                    : <CheckCircle2 className="h-3 w-3" />}
                                                                Gefactureerd
                                                            </Button>
                                                        )}
                                                        {allInvoiced && (
                                                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                                <Check className="h-3 w-3" /> Gefactureerd
                                                            </span>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteInvoice(customer)}
                                                            disabled={isDeleting === id}
                                                        >
                                                            {isDeleting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {customer.orders.map(order => (
                                                        <div key={order.id} className="flex items-center gap-1 bg-background border rounded-md pr-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-[10px] gap-1 px-2 border-r rounded-r-none hover:bg-muted"
                                                                onClick={() => {
                                                                    setOrderToEdit(order)
                                                                    setIsEditorOpen(true)
                                                                }}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                                Order #{order.order_number}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 hover:bg-muted"
                                                                onClick={(e) => handleGeneratePDF(e, order)}
                                                                disabled={generatingPDF === order.id}
                                                                title="PDF downloaden"
                                                            >
                                                                {generatingPDF === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={(e) => handleDeleteOrder(e, order)}
                                                                disabled={isDeletingOrder === order.id}
                                                            >
                                                                {isDeletingOrder === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                            </Button>
                                                        </div>
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
                                                                    <div className="flex items-center gap-2">
                                                                        {order.is_invoiced && (
                                                                            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                                                                                <Check className="h-3 w-3" /> gefactureerd
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('nl-NL')}</span>
                                                                    </div>
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
                )
            })}

            {filteredData.sortedMonths.length === 0 && (
                <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    {searchQuery.trim() ? `Geen facturen gevonden voor "${searchQuery}".` : 'Geen bestellingen gevonden voor facturatie.'}
                </div>
            )}

            {orderToEdit && (
                <OrderEditor
                    open={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    order={orderToEdit}
                    products={products}
                    onSuccess={() => router.refresh()}
                />
            )}
        </div>
    )
}
