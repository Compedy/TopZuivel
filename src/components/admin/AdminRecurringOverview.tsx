
'use client'

import { useState, useEffect } from 'react'
import { Product, RecurringOrder, RecurringOrderItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    getRecurringOrders,
    deleteRecurringOrder,
    convertRecurringOrdersToReal,
    upsertRecurringOrder
} from '@/app/admin/actions'
import { Plus, Edit2, Trash2, Play, AlertCircle, CheckCircle2 } from 'lucide-react'
import RecurringOrderEditor from './RecurringOrderEditor'
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import { cn } from '@/lib/utils'

interface AdminRecurringOverviewProps {
    products: Product[]
}

type RecurringOrderWithItems = RecurringOrder & { recurring_order_items: RecurringOrderItem[] }

export default function AdminRecurringOverview({ products }: AdminRecurringOverviewProps) {
    const [recurringOrders, setRecurringOrders] = useState<RecurringOrderWithItems[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingOrder, setEditingOrder] = useState<RecurringOrderWithItems | undefined>()
    const [conversionStatus, setConversionStatus] = useState<{ success?: boolean, msg?: string } | null>(null)

    const fetchOrders = async () => {
        setIsLoading(true)
        const data = await getRecurringOrders()
        setRecurringOrders(data as RecurringOrderWithItems[])
        setIsLoading(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const handleDelete = async (id: string) => {
        if (confirm('Weet u zeker dat u deze periodieke bestelling wilt verwijderen?')) {
            const res = await deleteRecurringOrder(id)
            if (res.success) fetchOrders()
            else alert('Fout: ' + res.error)
        }
    }

    const handleToggleActive = async (order: RecurringOrderWithItems) => {
        const res = await upsertRecurringOrder(
            { ...order, is_active: !order.is_active },
            order.recurring_order_items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
        )
        if (res.success) fetchOrders()
    }

    const handleRunConversion = async () => {
        if (confirm('Wilt u nu alle actieve periodieke bestellingen omzetten naar echte bestellingen voor deze week?')) {
            const res = await convertRecurringOrdersToReal()
            if (res.success) {
                setConversionStatus({ success: true, msg: `Succesvol voltooid. ${res.results?.filter(r => r.success).length} bestellingen aangemaakt.` })
            } else {
                setConversionStatus({ success: false, msg: 'Fout bij omzetten: ' + res.error })
            }
            setTimeout(() => setConversionStatus(null), 5000)
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Periodieke Bestellingen</h2>
                    <p className="text-sm text-muted-foreground">Beheer wekelijkse bestellingen die elke vrijdag automatisch worden aangemaakt.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRunConversion} className="gap-2">
                        <Play className="h-4 w-4" /> Nu Uitvoeren (Test)
                    </Button>
                    <Button onClick={() => { setEditingOrder(undefined); setIsEditorOpen(true); }} className="gap-2">
                        <Plus className="h-4 w-4" /> Nieuwe Toevoegen
                    </Button>
                </div>
            </div>

            {conversionStatus && (
                <Alert variant={conversionStatus.success ? "default" : "destructive"} className={cn(conversionStatus.success ? "border-green-500 bg-green-50" : "")}>
                    {conversionStatus.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{conversionStatus.success ? 'Voltooid' : 'Fout'}</AlertTitle>
                    <AlertDescription>{conversionStatus.msg}</AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground">Laden...</div>
            ) : recurringOrders.length === 0 ? (
                <Card className="border-dashed py-20 text-center">
                    <p className="text-muted-foreground">Geen periodieke bestellingen gevonden.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {recurringOrders.map(order => (
                        <Card key={order.id} className={cn("transition-all", !order.is_active && "opacity-60 grayscale-[0.5]")}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">{order.company_name}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">{order.email}</p>
                                        {order.price_modifier !== 0 && (
                                            <Badge variant={order.price_modifier < 0 ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                                                {order.price_modifier > 0 ? '+' : ''}{order.price_modifier}% modifier
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => { setEditingOrder(order); setIsEditorOpen(true); }}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(order.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producten</div>
                                    <div className="space-y-1.5 border rounded-md p-3 bg-muted/20">
                                        {order.recurring_order_items.map(item => {
                                            const product = products.find(p => p.id === item.product_id)
                                            return (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.quantity}× {product?.name || 'Onbekend'}</span>
                                                    <span className="text-muted-foreground text-[10px]">{product?.unit_label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <Badge
                                            variant={order.is_active ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => handleToggleActive(order)}
                                        >
                                            {order.is_active ? 'Actief' : 'Gepauzeerd'}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">Laatst gewijzigd: {new Date(order.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <RecurringOrderEditor
                open={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                products={products}
                existingOrder={editingOrder}
                onSuccess={fetchOrders}
            />
        </div>
    )
}
