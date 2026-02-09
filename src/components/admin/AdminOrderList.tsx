'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { OrderWithItems } from '@/types'
import { ChevronDown, ChevronUp, Scale, Save, Loader2, ListTree, RotateCcw, CheckCircle2, FileText } from 'lucide-react'
import { updateOrderItemQuantity, updateOrderStatus, splitOrderItem } from '@/app/admin/actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AdminOrderListProps {
    initialOrders: OrderWithItems[]
}

const getDisplayQuantity = (qty: number, unit?: string) => {
    const normalizedUnit = unit?.toLowerCase() || ''
    if (normalizedUnit === 'st' || normalizedUnit === 'stuk' || normalizedUnit === 'blok') {
        return Math.round(qty)
    }
    return qty
}

export default function AdminOrderList({ initialOrders }: AdminOrderListProps) {
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [editingItems, setEditingItems] = useState<Record<string, {
        totalWeight: number,
        displayTotalWeight: string,
        units: number[],
        displayUnits: string[],
        isExpanded: boolean
    }>>({})
    const [saving, setSaving] = useState<string | null>(null)
    const [completing, setCompleting] = useState<string | null>(null)
    const [showCompleted, setShowCompleted] = useState(false)

    const filteredOrders = useMemo(() => {
        return initialOrders.filter(order => showCompleted ? true : order.status !== 'completed')
    }, [initialOrders, showCompleted])

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
        const totalWeight = item.quantity * standardWeight

        const unitCount = Math.max(1, Math.ceil(item.quantity))
        const units = Array(unitCount).fill(standardWeight)

        if (item.quantity % 1 !== 0 && unitCount > 1) {
            const sumOfOthers = (unitCount - 1) * standardWeight
            units[unitCount - 1] = Math.max(0, totalWeight - sumOfOthers)
        }

        setEditingItems(prev => ({
            ...prev,
            [item.id]: {
                totalWeight: totalWeight,
                displayTotalWeight: (totalWeight / (item.quantity || 1)).toString(),
                units: units,
                displayUnits: units.map(u => u.toString()),
                isExpanded: false
            }
        }))
    }

    const handleWeightChange = (itemId: string, displayVal: string, quantity: number) => {
        setEditingItems(prev => {
            const item = prev[itemId]
            if (!item) return prev
            const num = parseFloat(displayVal.replace(',', '.'))
            return {
                ...prev,
                [itemId]: {
                    ...item,
                    displayTotalWeight: displayVal,
                    totalWeight: (isNaN(num) ? 0 : num) * quantity
                }
            }
        })
    }

    const handleUnitWeightChange = (itemId: string, index: number, displayVal: string) => {
        setEditingItems(prev => {
            const item = prev[itemId]
            if (!item) return prev
            const newUnits = [...item.units]
            const newDisplayUnits = [...item.displayUnits]

            newDisplayUnits[index] = displayVal
            const num = parseFloat(displayVal.replace(',', '.'))
            newUnits[index] = isNaN(num) ? 0 : num

            const newTotal = newUnits.reduce((a, b) => a + b, 0)
            return {
                ...prev,
                [itemId]: {
                    ...item,
                    units: newUnits,
                    displayUnits: newDisplayUnits,
                    totalWeight: newTotal
                }
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

        let result;
        if (editData.isExpanded) {
            // Persist as separate records
            const quantities = editData.units.map(u => u / (standardWeight || 1))
            result = await splitOrderItem(itemId, quantities)
        } else {
            // Standard update
            const newQuantity = editData.totalWeight / (standardWeight || 1)
            result = await updateOrderItemQuantity(itemId, newQuantity)
        }

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

    const getBase64ImageFromURL = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.setAttribute('crossOrigin', 'anonymous')
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0)
                const dataURL = canvas.toDataURL('image/png')
                resolve(dataURL)
            }
            img.onerror = (error) => reject(error)
            img.src = url
        })
    }

    const generatePDF = async (order: OrderWithItems) => {
        try {
            const doc = new jsPDF()
            const today = new Date().toLocaleDateString('nl-NL')
            const orderDate = new Date(order.created_at).toLocaleDateString('nl-NL')

            // Add Logo with try/catch for loading issues
            try {
                const logoUrl = '/logo.png'
                const imgData = await getBase64ImageFromURL(logoUrl)
                doc.addImage(imgData, 'PNG', 15, 10, 40, 20)
            } catch (imgError) {
                console.warn('Could not load logo for PDF:', imgError)
                // Continue without logo
                doc.setFontSize(18)
                doc.setTextColor(44, 62, 80)
                doc.text('TOP ZUIVEL', 15, 20)
            }

            // Header Info
            doc.setFontSize(20)
            doc.setTextColor(44, 62, 80)
            doc.text('Order Overzicht', 70, 25)

            doc.setFontSize(10)
            doc.setTextColor(100)
            doc.text(`Klant: ${order.company_name || 'Onbekend'}`, 15, 45)
            doc.text(`Email: ${order.email}`, 15, 52)
            doc.text(`Besteldatum: ${orderDate}`, 15, 59)

            // Table
            const tableData = order.order_items.map(item => {
                const standardWeight = item.products?.weight_per_unit || 1
                const weight = item.quantity * standardWeight
                const isPerKilo = item.products?.is_price_per_kilo
                const totalPrice = isPerKilo ? weight * item.price_snapshot : item.quantity * item.price_snapshot
                const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)

                return [
                    item.products?.name || 'Onbekend product',
                    `${displayQty} ${item.products?.unit_label || 'st'}`,
                    `${weight.toFixed(3)} kg`,
                    formatPrice(item.price_snapshot) + (isPerKilo ? '/kg' : ''),
                    formatPrice(totalPrice)
                ]
            })

            autoTable(doc, {
                startY: 75,
                head: [['Product', 'Aantal', 'Gewicht', 'Prijs (één)', 'Totaal']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [44, 62, 80] },
                styles: { fontSize: 9 }
            })

            // Totals
            const totalItems = order.order_items.reduce((sum, item) => sum + getDisplayQuantity(item.quantity, item.products?.unit_label), 0)
            const totalPrice = order.order_items.reduce((sum, item) => {
                const weight = item.quantity * (item.products?.weight_per_unit || 1)
                const isPerKilo = item.products?.is_price_per_kilo
                return sum + (isPerKilo ? weight * item.price_snapshot : item.quantity * item.price_snapshot)
            }, 0)

            const lastY = (doc as any).lastAutoTable.finalY + 10
            doc.setFont('helvetica', 'bold')
            doc.text(`Totaal aantal items: ${totalItems}`, 15, lastY)
            doc.setFontSize(14)
            doc.text(`Totaal bedrag: ${formatPrice(totalPrice)}`, 15, lastY + 10)

            // Footer
            doc.setFontSize(8)
            doc.setFont('helvetica', 'italic')
            doc.text('Top Zuivel - Vers van de boerderij', 15, 285)

            doc.save(`TopZuivel_Order_${order.company_name}_${today}.pdf`)
        } catch (err) {
            console.error('General PDF error:', err)
            alert('Fout bij het genereren van de PDF. Controleer de console voor details.')
        }
    }

    const completeOrder = async (order: OrderWithItems) => {
        // First check if there are unsaved changes IN THIS ORDER
        const hasUnsavedChanges = order.order_items.some(item => {
            const editData = editingItems[item.id]
            if (!editData) return false
            const standardWeight = item.products?.weight_per_unit || 1
            const currentTotalWeight = item.quantity * standardWeight
            return Math.abs(editData.totalWeight - currentTotalWeight) > 0.0001
        })

        if (hasUnsavedChanges) {
            if (!confirm('Er zijn nog niet-opgeslagen wijzigingen in deze bestelling. Wilt u doorgaan en deze negeren?')) {
                return
            }
        }

        setCompleting(order.id)
        try {
            const result = await updateOrderStatus(order.id, 'completed')
            if (result.success) {
                await generatePDF(order)
                setExpandedOrder(null)
            } else {
                alert('Fout bij afronden bestelling: ' + result.error)
            }
        } catch (error) {
            alert('Systeemfout bij afronden bestelling.')
            console.error(error)
        } finally {
            setCompleting(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-lg">Bestellingen Beheer</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="show-completed" className="text-sm text-muted-foreground">Toon voltooid</Label>
                    <Switch
                        id="show-completed"
                        checked={showCompleted}
                        onCheckedChange={setShowCompleted}
                    />
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">Geen bestellingen gevonden.</CardContent>
                </Card>
            ) : (
                filteredOrders.map(order => {
                    const isExpanded = expandedOrder === order.id
                    const isCompleted = order.status === 'completed'

                    return (
                        <Card key={order.id} className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary shadow-lg border-l-4 border-l-primary' : 'hover:shadow-md'} ${isCompleted ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                            <CardHeader
                                className={`bg-muted/30 py-4 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'border-b' : ''}`}
                                onClick={() => toggleOrder(order.id)}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{order.company_name || 'Onbekende Klant'}</span>
                                        <Badge variant={isCompleted ? 'outline' : (order.status === 'open' || order.status === 'pending') ? 'default' : 'secondary'} className={`text-[10px] uppercase ${isCompleted ? 'bg-green-100 text-green-700 border-green-200' : ''}`}>
                                            {order.status === 'completed' ? 'voldaan' : order.status === 'pending' ? 'open' : order.status}
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
                                    <div className="md:overflow-x-auto">
                                        <div className="md:hidden space-y-4 p-4">
                                            {order.order_items.map((item) => {
                                                const isCheese = item.products?.category === 'Kaas'
                                                const editData = editingItems[item.id]
                                                const standardWeight = item.products?.weight_per_unit || 1
                                                const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)
                                                const totalWeight = editData ? editData.totalWeight : (item.quantity * standardWeight)
                                                const displayWeight = totalWeight / (displayQty || 1)
                                                const hasChanged = Math.abs(totalWeight - (item.quantity * standardWeight)) > 0.0001
                                                const rowTotalPrice = item.products?.is_price_per_kilo
                                                    ? (totalWeight * item.price_snapshot)
                                                    : ((totalWeight / (standardWeight || 1)) * item.price_snapshot)

                                                return (
                                                    <div key={item.id} className="border rounded-lg p-3 space-y-3 bg-muted/10">
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-sm">
                                                                {item.products?.name}
                                                                {isCheese && (
                                                                    <Badge variant="outline" className="ml-2 text-[10px] text-blue-600 border-blue-200 bg-blue-50">Kaas</Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold">{displayQty} {item.products?.unit_label}</div>
                                                                {isCheese && (
                                                                    <div className="text-[10px] text-muted-foreground">Standaard: {standardWeight.toFixed(3)} kg/st</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isCheese && !isCompleted ? (
                                                            <div className="space-y-2">
                                                                {!editData?.isExpanded ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="relative flex-1">
                                                                            <Scale className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                            <Input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={editData?.displayTotalWeight || displayWeight.toString()}
                                                                                onChange={(e) => {
                                                                                    initEditing(item)
                                                                                    handleWeightChange(item.id, e.target.value, item.quantity)
                                                                                }}
                                                                                className={`w-full h-10 pl-8 text-right font-bold border-2 ${hasChanged ? 'border-orange-500' : 'border-input'}`}
                                                                            />
                                                                        </div>
                                                                        <span className="text-xs font-bold text-muted-foreground uppercase">kg/st</span>
                                                                        {item.quantity >= 1 && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="h-10 w-10 text-blue-600 border-blue-200"
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
                                                                    <div className="bg-muted/50 p-2 rounded-md space-y-2 border shadow-inner">
                                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground px-1">
                                                                            <span>Gewicht per stuk (kg)</span>
                                                                            <button onClick={() => toggleUnitsExpand(item.id)} className="text-blue-600 underline">Sluiten</button>
                                                                        </div>
                                                                        {editData.units.map((unitWeight, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2">
                                                                                <span className="text-[10px] w-4 text-muted-foreground">#{idx + 1}</span>
                                                                                <Input
                                                                                    type="text"
                                                                                    inputMode="decimal"
                                                                                    value={editData?.displayUnits[idx] || unitWeight.toString()}
                                                                                    onChange={(e) => handleUnitWeightChange(item.id, idx, e.target.value)}
                                                                                    className="w-full h-8 text-right text-xs"
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center border-t pt-2">
                                                                    <div className="text-xs font-bold text-primary">Subtotaal: {formatPrice(rowTotalPrice)}</div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            disabled={!editData || saving === item.id || !hasChanged}
                                                                            onClick={() => saveWeight(item.id, standardWeight)}
                                                                            className="h-8 px-4"
                                                                        >
                                                                            {saving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                                        </Button>
                                                                        {hasChanged && (
                                                                            <Button variant="ghost" size="sm" onClick={() => setEditingItems(prev => {
                                                                                const newState = { ...prev };
                                                                                delete newState[item.id];
                                                                                return newState;
                                                                            })} className="h-8 text-destructive">
                                                                                <RotateCcw className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-center border-t pt-2 text-xs">
                                                                <span className="text-muted-foreground italic">{isCompleted ? 'Vastgezet' : 'Niet aanpasbaar'}</span>
                                                                <span className="font-bold">Subtotaal: {formatPrice(rowTotalPrice)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <table className="hidden md:table w-full text-sm">
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
                                                    const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)
                                                    const totalWeight = editData ? editData.totalWeight : (item.quantity * standardWeight)
                                                    const displayWeight = totalWeight / (displayQty || 1)
                                                    const hasChanged = Math.abs(totalWeight - (item.quantity * standardWeight)) > 0.0001

                                                    const rowTotalPrice = item.products?.is_price_per_kilo
                                                        ? (totalWeight * item.price_snapshot)
                                                        : ((totalWeight / (standardWeight || 1)) * item.price_snapshot)

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
                                                                    <span className="font-semibold">{displayQty} {item.products?.unit_label}</span>
                                                                    {isCheese && (
                                                                        <span className="text-[10px] text-muted-foreground bg-muted p-1 rounded mt-1">
                                                                            Standaard: {standardWeight.toFixed(3)} kg/st
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                <div className="flex flex-col items-end gap-2">
                                                                    {isCheese && !isCompleted ? (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            {!editData?.isExpanded ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="relative group">
                                                                                        <Scale className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                                                        <Input
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            value={editData?.displayTotalWeight || displayWeight.toString()}
                                                                                            onChange={(e) => {
                                                                                                initEditing(item)
                                                                                                handleWeightChange(item.id, e.target.value, item.quantity)
                                                                                            }}
                                                                                            className={`w-32 h-10 pl-8 text-right font-bold text-lg border-2 ${hasChanged ? 'border-orange-500 focus:ring-orange-500' : 'border-input'}`}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-sm font-bold text-muted-foreground uppercase">kg/st</span>

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
                                                                                                type="text"
                                                                                                inputMode="decimal"
                                                                                                value={editData.displayUnits[idx] || unitWeight.toString()}
                                                                                                onChange={(e) => handleUnitWeightChange(item.id, idx, e.target.value)}
                                                                                                className="w-full h-8 text-right text-xs"
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="pt-2 border-t flex justify-between items-center text-xs font-bold">
                                                                                        <span>Stuks Totaal</span>
                                                                                        <span className={`${hasChanged ? 'text-orange-600' : ''}`}>{totalWeight.toFixed(3)} kg</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <div className="flex items-center gap-2">
                                                                                {hasChanged && (
                                                                                    <span className="text-[10px] text-orange-600 font-bold">
                                                                                        Verschil: {(((totalWeight / (item.quantity * standardWeight)) - 1) * 100).toFixed(1)}%
                                                                                    </span>
                                                                                )}
                                                                                <div className="text-xs font-bold text-primary">
                                                                                    Subtotaal: {formatPrice(rowTotalPrice)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-muted-foreground text-xs italic">{isCompleted ? 'Vastgezet' : 'Niet aanpasbaar'}</span>
                                                                            <div className="text-xs font-bold text-muted-foreground">
                                                                                Subtotaal: {formatPrice(rowTotalPrice)}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 text-right">
                                                                {!isCompleted && isCheese && (
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
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-4 bg-muted/20 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-2 w-full md:w-auto">
                                            <div className="text-[10px] md:text-xs text-muted-foreground italic">
                                                * Totale prijsindicatie op basis van actuele gewichten.
                                            </div>
                                            {!isCompleted && (
                                                <Button
                                                    onClick={() => completeOrder(order)}
                                                    disabled={completing === order.id}
                                                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white gap-2 font-bold shadow-md hover:shadow-lg transition-all"
                                                >
                                                    {completing === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Afronden & PDF
                                                </Button>
                                            )}
                                            {isCompleted && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => generatePDF(order)}
                                                    className="w-full md:w-auto gap-2"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    Bekijk PDF
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                            <span className="text-sm font-medium text-muted-foreground">Totaal:</span>
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
