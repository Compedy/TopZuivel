'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OrderWithItems } from '@/types'
import { ChevronDown, ChevronUp, Scale, Save, Loader2, ListTree, RotateCcw } from 'lucide-react'
import { updateOrderItemQuantity } from '@/app/admin/actions'

interface AdminOrderListProps {
    initialOrders: OrderWithItems[]
}

export default function AdminOrderList({ initialOrders }: AdminOrderListProps) {
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [editingItems, setEditingItems] = useState<Record<string, { totalWeight: number, units: number[], isExpanded: boolean }>>({})
    const [saving, setSaving] = useState<string | null>(null)

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('nl-NL', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
    }

    const toggleOrder = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId)
    }

    const initEditing = (item: any) => {
        if (editingItems[item.id]) return

        const standardWeight = item.products?.weight_per_unit || 1
        const currentTotalWeight = item.quantity * standardWeight

        const unitCount = Math.max(1, Math.ceil(item.quantity))
        const units = Array(unitCount).fill(standardWeight)

        setEditingItems(prev => ({
            ...prev,
            [item.id]: {
                totalWeight: currentTotalWeight,
                units: units,
                isExpanded: false
            }
        }))
    }

    const handleWeightChange = (itemId: string, val: number) => {
        setEditingItems(prev => {
            const item = prev[itemId]
            if (!item) return prev
            return {
                ...prev,
                [itemId]: { ...item, totalWeight: val }
            }
        })
    }

    const handleUnitWeightChange = (itemId: string, index: number, val: number) => {
        setEditingItems(prev => {
            const item = prev[itemId]
            if (!item) return prev
            const newUnits = [...item.units]
            newUnits[index] = val
            const newTotal = newUnits.reduce((a, b) => a + b, 0)
            return {
                ...prev,
                [itemId]: { ...item, units: newUnits, totalWeight: newTotal }
            }
        })
    }

    const toggleUnitsExpand = (itemId: string) => {
        setEditingItems(prev => {
            const item = prev[itemId]
            if (!item) return prev
            return {
                ...prev,
                [itemId]: { ...item, isExpanded: !item.isExpanded }
            }
        })
    }

    const saveWeight = async (itemId: string, standardWeight: number) => {
        const editData = editingItems[itemId]
        if (!editData) return

        setSaving(itemId)
        const newQuantity = editData.totalWeight / (standardWeight || 1)

        const result = await updateOrderItemQuantity(itemId, newQuantity)

        if (result.success) {
            setEditingItems(prev => {
                const newState = { ...prev }
                delete newState[itemId]
                return newState
            })
        } else {
            alert('Fout bij opslaan: ' + result.error)
        }
        setSaving(null)
    }

    return (
        <div className="space-y-4">
            {initialOrders.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">Geen bestellingen gevonden.</CardContent>
                </Card>
            ) : (
                initialOrders.map(order => {
                    const isExpanded = expandedOrder === order.id
                    return (
                        <Card key={order.id} className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary shadow-lg border-l-4 border-l-primary' : 'hover:shadow-md'}`}>
                            <CardHeader
                                className={`bg-muted/30 py-4 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'border-b' : ''}`}
                                onClick={() => toggleOrder(order.id)}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{order.company_name || 'Onbekende Klant'}</span>
                                        <Badge variant={order.status === 'pending' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                            {order.status}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{order.email}</span>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        {formatDate(order.created_at)}
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </span>
                                </div>
                            </CardHeader>
                            {isExpanded && (
                                <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 text-muted-foreground border-b text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th className="py-3 px-4 text-left font-semibold">Product</th>
                                                    <th className="py-3 px-4 text-center font-semibold">Originele Bestelling</th>
                                                    <th className="py-3 px-4 text-right font-semibold">Aanpassen Gewicht / Aantal</th>
                                                    <th className="py-3 px-4 text-right font-semibold w-24">Actie</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {order.order_items.map((item) => {
                                                    const isCheese = item.products?.category === 'Kaas'
                                                    const editData = editingItems[item.id]
                                                    const standardWeight = item.products?.weight_per_unit || 1
                                                    const displayWeight = editData ? editData.totalWeight : (item.quantity * standardWeight)
                                                    const hasChanged = Math.abs(displayWeight - (item.quantity * standardWeight)) > 0.0001

                                                    const rowTotalPrice = item.products?.is_price_per_kilo
                                                        ? (displayWeight * item.price_snapshot)
                                                        : ((displayWeight / (standardWeight || 1)) * item.price_snapshot)

                                                    return (
                                                        <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="py-4 px-4 font-medium">
                                                                {item.products?.name}
                                                                {isCheese && (
                                                                    <Badge variant="outline" className="ml-2 text-[10px] text-blue-600 border-blue-200 bg-blue-50">Kaas</Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold">{item.quantity} {item.products?.unit_label}</span>
                                                                    <span className="text-[10px] text-muted-foreground bg-muted p-1 rounded mt-1">
                                                                        Standaard: {(item.quantity * standardWeight).toFixed(3)} kg
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <div className="flex flex-col items-end gap-2">
                                                                    {isCheese ? (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            {!editData?.isExpanded ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="relative group">
                                                                                        <Scale className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.001"
                                                                                            value={displayWeight}
                                                                                            onChange={(e) => {
                                                                                                initEditing(item)
                                                                                                handleWeightChange(item.id, parseFloat(e.target.value))
                                                                                            }}
                                                                                            className={`w-32 h-10 pl-8 text-right font-bold text-lg border-2 ${hasChanged ? 'border-orange-500 focus:ring-orange-500' : 'border-input'}`}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-sm font-bold text-muted-foreground uppercase">kg</span>

                                                                                    {item.quantity >= 1 && (
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                                            title="Splits per stuk"
                                                                                            onClick={() => {
                                                                                                initEditing(item)
                                                                                                setTimeout(() => toggleUnitsExpand(item.id), 0)
                                                                                            }}
                                                                                        >
                                                                                            <ListTree className="h-4 w-4" />
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="bg-muted/50 p-2 rounded-md space-y-2 border border-border shadow-inner min-w-[200px]">
                                                                                    <div className="text-[10px] font-bold uppercase text-muted-foreground text-left px-1 flex justify-between gap-10">
                                                                                        <span>Gewicht per stuk (kg)</span>
                                                                                        <button
                                                                                            onClick={() => toggleUnitsExpand(item.id)}
                                                                                            className="hover:underline text-blue-600 capitalize text-[10px]"
                                                                                        >
                                                                                            Inklappen
                                                                                        </button>
                                                                                    </div>
                                                                                    {editData.units.map((unitWeight, idx) => (
                                                                                        <div key={idx} className="flex items-center gap-2">
                                                                                            <span className="text-[10px] w-4 text-muted-foreground">#{idx + 1}</span>
                                                                                            <Input
                                                                                                type="number"
                                                                                                step="0.001"
                                                                                                value={unitWeight}
                                                                                                onChange={(e) => handleUnitWeightChange(item.id, idx, parseFloat(e.target.value))}
                                                                                                className="w-full h-8 text-right text-xs"
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="pt-2 border-t flex justify-between items-center text-xs font-bold">
                                                                                        <span>Totaal</span>
                                                                                        <span className={`${hasChanged ? 'text-orange-600' : ''}`}>{displayWeight.toFixed(3)} kg</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <div className="flex items-center gap-2">
                                                                                {hasChanged && (
                                                                                    <span className="text-[10px] text-orange-600 font-bold">
                                                                                        Verschil: {(((displayWeight / (item.quantity * standardWeight)) - 1) * 100).toFixed(1)}%
                                                                                    </span>
                                                                                )}
                                                                                <div className="text-xs font-bold text-primary">
                                                                                    Subtotaal: {formatPrice(rowTotalPrice)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-muted-foreground text-xs italic">Niet aanpasbaar</span>
                                                                            <div className="text-xs font-bold text-muted-foreground">
                                                                                Subtotaal: {formatPrice(item.quantity * item.price_snapshot)}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <div className="flex flex-col gap-1">
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 w-full gap-1"
                                                                        disabled={!editData || saving === item.id || !hasChanged}
                                                                        onClick={() => saveWeight(item.id, standardWeight)}
                                                                    >
                                                                        {saving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                                        Opslaan
                                                                    </Button>
                                                                    {hasChanged && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 text-[10px] text-muted-foreground hover:text-destructive w-full"
                                                                            onClick={() => {
                                                                                setEditingItems(prev => {
                                                                                    const newState = { ...prev }
                                                                                    delete newState[item.id]
                                                                                    return newState
                                                                                })
                                                                            }}
                                                                        >
                                                                            <RotateCcw className="h-3 w-3 mr-1" />
                                                                            Herstellen
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-4 bg-muted/20 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="text-xs text-muted-foreground italic">
                                            * Totale prijsindicatie op basis van actuele gewichten.
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-muted-foreground">Totaalindicatie:</span>
                                            <div className="text-2xl font-black text-primary">
                                                {formatPrice(order.order_items.reduce((sum, item) => {
                                                    const editData = editingItems[item.id]
                                                    const weight = editData ? editData.totalWeight : (item.quantity * (item.products?.weight_per_unit || 1))

                                                    if (item.products?.is_price_per_kilo) {
                                                        return sum + (weight * item.price_snapshot)
                                                    } else {
                                                        const standardWeight = item.products?.weight_per_unit || 1
                                                        const ratio = standardWeight > 0 ? (weight / standardWeight) : item.quantity
                                                        return sum + (ratio * item.price_snapshot)
                                                    }
                                                }, 0))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    )
                })
            )}
        </div>
    )
}
