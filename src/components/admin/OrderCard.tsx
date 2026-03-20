'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ChevronUp, ChevronDown, FileText, Loader2 } from 'lucide-react'
import { OrderWithItems } from '@/types'
import OrderItemRow from './OrderItemRow'
import { cn } from '@/lib/utils'

type OrderItemWithProduct = OrderWithItems['order_items'][number]

interface EditData {
    totalWeight: number
    displayTotalWeight: string
    units: number[]
    displayUnits: string[]
    isExpanded: boolean
}

interface OrderCardProps {
    order: OrderWithItems
    isExpanded: boolean
    onToggleExpand: () => void
    onEdit: () => void
    onDelete: () => void
    onComplete: () => void
    formatDate: (date: string) => string
    formatPrice: (price: number) => string
    editingItems: Record<string, EditData>
    optimisticCompletion: Record<string, boolean>
    saving: string | null
    completing: string | null
    handlers: {
        handleToggleCompletion: (itemId: string, currentStatus: boolean) => void
        handleWeightChange: (itemId: string, val: string) => void
        handleSaveWeight: (item: OrderItemWithProduct, standardWeight: number) => void
        handleResetWeight: (itemId: string, unitLabel?: string) => void
        handleCancelEdit: (itemId: string) => void
        handleInitEditing: (item: OrderItemWithProduct) => void
    }
}

export default function OrderCard({
    order,
    isExpanded,
    onToggleExpand,
    onEdit,
    onDelete,
    onComplete,
    formatDate,
    formatPrice,
    editingItems,
    optimisticCompletion,
    saving,
    completing,
    handlers
}: OrderCardProps) {
    const isCompleted = order.status === 'completed'

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-200",
            isExpanded ? "ring-2 ring-primary shadow-lg border-l-4 border-l-primary" : "hover:shadow-md",
            isCompleted && "opacity-70 grayscale-[0.5]"
        )}>
            <CardHeader
                className={cn(
                    "bg-muted/30 py-4 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors",
                    isExpanded && "border-b"
                )}
                onClick={onToggleExpand}
            >
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-lg">{order.company_name || 'Onbekende Klant'}</span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Order #{order.order_number}</span>
                        </div>
                        <Badge variant={isCompleted ? 'outline' : (order.status === 'open' || order.status === 'pending') ? 'default' : 'secondary'} className={cn(
                            "text-[10px] uppercase",
                            isCompleted && "bg-green-100 text-green-700 border-green-200"
                        )}>
                            {order.status === 'completed' ? 'voldaan' : order.status === 'pending' ? 'open' : order.status}
                        </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{order.email}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit()
                            }}
                        >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete()
                            }}
                            disabled={saving === order.id}
                        >
                            {saving === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right shrink-0">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            {formatDate(order.created_at)}
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                        {order.notes && !isExpanded && (
                            <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200 italic max-w-[200px] truncate">
                                {order.notes.length > 100 ? order.notes.substring(0, 100) + '...' : order.notes}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                    {order.notes && (
                        <div className="bg-yellow-50/50 p-4 border-b border-yellow-100">
                            <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Opmerking van klant:</span>
                                    <p className="text-sm text-yellow-900 leading-relaxed font-medium">
                                        {order.notes}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="md:overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground border-b text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4 text-left font-semibold w-10">Vink</th>
                                    <th className="py-3 px-4 text-left font-semibold">Product</th>
                                    <th className="py-3 px-4 text-center font-semibold">Bestelling</th>
                                    <th className="py-3 px-4 text-right font-semibold">Aanpassen</th>
                                    <th className="py-3 px-4 text-right font-semibold w-24">Actie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[...order.order_items].sort((a, b) => (a.products?.sort_order ?? 999) - (b.products?.sort_order ?? 999)).map((item) => {
                                    const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                                    const isWeightAdjustable = !!(!isCompleted && (
                                        item.products?.category === 'Kaas' ||
                                        unitLabel === 'kg' ||
                                        item.products?.is_price_per_kilo ||
                                        (item.products?.weight_per_unit && item.products.weight_per_unit > 0)
                                    ))
                                    const isItemCompleted = !!(optimisticCompletion[item.id] ?? item.is_completed)
                                    const editData = editingItems[item.id]
                                    const standardWeight = item.products?.weight_per_unit || 1
                                    const initialWeight = item.actual_weight ?? (item.quantity * standardWeight)
                                    const totalWeight = editData ? editData.totalWeight : initialWeight
                                    const hasChanged = Math.abs(totalWeight - initialWeight) > 0.0001

                                    return (
                                        <OrderItemRow
                                            key={item.id}
                                            item={item}
                                            isCompleted={isCompleted}
                                            isItemCompleted={isItemCompleted}
                                            isWeightAdjustable={isWeightAdjustable}
                                            editData={editData}
                                            saving={saving === item.id}
                                            hasChanged={hasChanged}
                                            onToggleCompletion={() => handlers.handleToggleCompletion(item.id, isItemCompleted)}
                                            onWeightChange={(val) => handlers.handleWeightChange(item.id, val)}
                                            onSaveWeight={() => handlers.handleSaveWeight(item, standardWeight)}
                                            onResetWeight={() => handlers.handleResetWeight(item.id, item.products?.unit_label)}
                                            onCancelEdit={() => handlers.handleCancelEdit(item.id)}
                                            onInitEditing={() => handlers.handleInitEditing(item)}
                                            formatPrice={formatPrice}
                                        />
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-muted/20 border-t flex justify-end gap-3">
                        <Button
                            variant="default"
                            onClick={(e) => {
                                e.stopPropagation()
                                onComplete()
                            }}
                            disabled={!!completing}
                            className="gap-2"
                        >
                            {completing === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            Printen & Afronden
                        </Button>
                    </div>
                </CardContent>
            )
            }
        </Card >
    )
}
