'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { OrderWithItems, Product } from '@/types'
import { ChevronDown, ChevronUp, Scale, Save, Loader2, ListTree, RotateCcw, CheckCircle2, FileText, Search } from 'lucide-react'
import {
    updateOrderItemQuantity,
    updateOrderStatus,
    updateOrderMetadata,
    addOrderItem,
    removeOrderItem,
    toggleOrderItemCompletion
} from '@/app/admin/actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import OrderEditor from './OrderEditor'
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdminOrderListProps {
    initialOrders: OrderWithItems[]
    products: Product[]
}

const getDisplayQuantity = (qty: number, unit?: string) => {
    const normalizedUnit = unit?.toLowerCase() || ''
    if (normalizedUnit === 'st' || normalizedUnit === 'stuk' || normalizedUnit === 'blok') {
        return Math.round(qty)
    }
    return qty
}

export default function AdminOrderList({ initialOrders, products }: AdminOrderListProps) {
    const router = useRouter()
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
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
    const [searchQuery, setSearchQuery] = useState('')

    const filteredOrders = useMemo(() => {
        return initialOrders.filter(order => {
            const matchesStatus = showCompleted ? true : order.status !== 'completed'
            if (!matchesStatus) return false

            if (!searchQuery) return true

            const term = searchQuery.toLowerCase()
            const orderNum = order.order_number?.toString().toLowerCase() || ''
            const company = order.company_name?.toLowerCase() || ''
            const email = order.email?.toLowerCase() || ''

            return orderNum.includes(term) || company.includes(term) || email.includes(term)
        })
    }, [initialOrders, showCompleted, searchQuery])

    const orderToEdit = useMemo(() => {
        return initialOrders.find(o => o.id === editingOrderId)
    }, [initialOrders, editingOrderId])

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

    const handleToggleCompletion = async (itemId: string, currentStatus: boolean) => {
        const result = await toggleOrderItemCompletion(itemId, !currentStatus)
        if (!result.success) {
            alert('Fout bij bijwerken status: ' + result.error)
        } else {
            router.refresh()
        }
    }

    const initEditing = (item: any) => {
        if (editingItems[item.id]) return

        const standardWeight = item.products?.weight_per_unit || 1
        const unitLabel = item.products?.unit_label?.toLowerCase() || ''
        const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)

        // Use actual_weight if it exists, otherwise calculate from quantity
        const totalWeight = item.actual_weight ?? (item.quantity * standardWeight)

        const unitCount = Math.max(1, Math.ceil(item.quantity))
        const units = Array(unitCount).fill(standardWeight)

        if (item.quantity % 1 !== 0 && unitCount > 1) {
            const sumOfOthers = (unitCount - 1) * standardWeight
            units[unitCount - 1] = Math.max(0, totalWeight - sumOfOthers)
        }

        const displayTotalWeight = isPieceBased
            ? Number((totalWeight / (item.quantity || 1)).toFixed(3)).toString()
            : Number(totalWeight.toFixed(3)).toString()

        setEditingItems(prev => ({
            ...prev,
            [item.id]: {
                totalWeight: totalWeight,
                displayTotalWeight: displayTotalWeight,
                units: units,
                displayUnits: units.map(u => Number(u.toFixed(3)).toString()),
                isExpanded: false
            }
        }))
    }

    const handleWeightChange = (itemId: string, displayVal: string) => {
        setEditingItems(prev => {
            const item = prev[itemId]
            if (!item) return prev
            const num = parseFloat(displayVal.replace(',', '.'))
            return {
                ...prev,
                [itemId]: {
                    ...item,
                    displayTotalWeight: displayVal,
                    totalWeight: isNaN(num) ? 0 : Math.round(num * 1000) / 1000
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
            newUnits[index] = isNaN(num) ? 0 : Math.round(num * 1000) / 1000

            const newTotal = newUnits.reduce((a, b) => a + b, 0)
            return {
                ...prev,
                [itemId]: {
                    ...item,
                    units: newUnits,
                    displayUnits: newDisplayUnits,
                    totalWeight: Math.round(newTotal * 1000) / 1000
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

    const resetWeight = async (itemId: string, unitLabel?: string) => {
        setSaving(itemId)
        const item = filteredOrders.flatMap(o => o.order_items).find(i => i.id === itemId)
        const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel?.toLowerCase() || '')

        // For piece based items, we want to clear the actual_weight override
        // while keeping the current pieces count.
        // For KG items, clearing weight is tricky because quantity IS weight.
        // But the user specifically mentioned prepacked items (piece based).

        let result;
        if (isPieceBased) {
            const pieces = item ? Math.round(item.quantity) : 1
            result = await updateOrderItemQuantity(itemId, pieces, null)
        } else {
            // For kg items, just notify success or do nothing if not applicable
            // (kg items don't really have "standard weight" overrides in the same way)
            result = { success: true }
        }

        if (result.success) {
            setEditingItems(prev => {
                const newState = { ...prev }
                delete newState[itemId]
                router.refresh()
                return newState
            })
        } else {
            alert('Fout bij herstellen: ' + result.error)
        }
        setSaving(null)
    }

    const saveWeight = async (itemId: string, standardWeight: number, unitLabel?: string) => {
        const editData = editingItems[itemId]
        if (!editData) return

        setSaving(itemId)

        const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel?.toLowerCase() || '')
        let result;
        if (isPieceBased) {
            // For piece based items, we keep quantity (pieces) the same
            // and store the total weight in actual_weight
            const item = filteredOrders.flatMap(o => o.order_items).find(i => i.id === itemId)
            const pieces = item ? Math.round(item.quantity) : 1

            // If the manually entered weight is equal to standard, store null instead
            const standardTotalWeight = pieces * (standardWeight || 1)
            const isActuallyDifferent = Math.abs(editData.totalWeight - standardTotalWeight) > 0.0001
            const weightToStore = isActuallyDifferent ? editData.totalWeight : null

            result = await updateOrderItemQuantity(itemId, pieces, weightToStore)
        } else {
            // For kg items, quantity IS the weight
            result = await updateOrderItemQuantity(itemId, editData.totalWeight)
        }

        if (result.success) {
            setEditingItems(prev => {
                const newState = { ...prev }
                delete newState[itemId]
                router.refresh()
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
            doc.text(`Order #: ${order.order_number}`, 15, 66)
            if (order.notes) {
                const notesY = 73
                doc.setFont('helvetica', 'bold')
                doc.text('Opmerking:', 15, notesY)
                doc.setFont('helvetica', 'normal')
                const splitNotes = doc.splitTextToSize(order.notes, 160)
                doc.text(splitNotes, 40, notesY)
            }

            // Table
            const sortedItems = [...order.order_items].sort((a, b) =>
                (a.products?.sort_order ?? 999) - (b.products?.sort_order ?? 999)
            )

            const tableData = sortedItems.map(item => {
                const standardWeight = item.products?.weight_per_unit || 1
                const weight = item.actual_weight ?? (item.quantity * standardWeight)
                const isPerKilo = item.products?.is_price_per_kilo
                const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)

                const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)

                return [
                    item.products?.name || 'Onbekend product',
                    `${displayQty} ${item.products?.unit_label || 'st'}`,
                    `${weight.toFixed(3)} kg`
                ]
            })

            autoTable(doc, {
                startY: 75,
                head: [['Product', 'Aantal', 'Gewicht']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [44, 62, 80] },
                styles: { fontSize: 9 }
            })

            // Totals
            const totalItems = order.order_items.reduce((sum, item) => sum + getDisplayQuantity(item.quantity, item.products?.unit_label), 0)

            const lastY = (doc as any).lastAutoTable.finalY + 10
            doc.setFont('helvetica', 'bold')
            doc.text(`Totaal aantal items: ${totalItems}`, 15, lastY)

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

        const allItemsCompleted = order.order_items.every(i => i.is_completed)
        if (!allItemsCompleted) {
            if (!confirm('Niet alle regels zijn gemarkeerd als gereed. Wilt u toch de PDF printen? De bestelling blijft in dat geval OPEN staan.')) {
                return
            }
            // Just generate PDF and stay open
            await generatePDF(order)
            return
        }

        setCompleting(order.id)
        try {
            const result = await updateOrderStatus(order.id, 'completed')
            if (result.success) {
                await generatePDF(order)
                setExpandedOrder(null)
                router.refresh()
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-lg">Bestellingen Beheer</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Zoek op #, klant of email..."
                            className="pl-8 h-9 text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center space-x-2 whitespace-nowrap">
                        <Label htmlFor="show-completed" className="text-sm text-muted-foreground">Toon voltooid</Label>
                        <Switch
                            id="show-completed"
                            checked={showCompleted}
                            onCheckedChange={setShowCompleted}
                        />
                    </div>
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
                                        <div className="flex flex-col">
                                            <span className="font-bold text-lg">{order.company_name || 'Onbekende Klant'}</span>
                                            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Order #{order.order_number}</span>
                                        </div>
                                        <Badge variant={isCompleted ? 'outline' : (order.status === 'open' || order.status === 'pending') ? 'default' : 'secondary'} className={`text-[10px] uppercase ${isCompleted ? 'bg-green-100 text-green-700 border-green-200' : ''}`}>
                                            {order.status === 'completed' ? 'voldaan' : order.status === 'pending' ? 'open' : order.status}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{order.email}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {!isCompleted && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingOrderId(order.id)
                                                setIsEditorOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                        </Button>
                                    )}
                                    <div className="flex flex-col items-end gap-1 text-right">
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            {formatDate(order.created_at)}
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </span>
                                        {order.notes && !isExpanded && (
                                            <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                                                Heeft opmerking
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
                                        <div className="md:hidden space-y-4 p-4">
                                            {[...order.order_items].sort((a, b) => (a.products?.sort_order ?? 999) - (b.products?.sort_order ?? 999)).map((item) => {
                                                const isCheese = item.products?.category === 'Kaas'
                                                const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                                                const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)
                                                const isWeightAdjustable = !isCompleted && (isCheese || unitLabel === 'kg' || item.products?.is_price_per_kilo)

                                                const editData = editingItems[item.id]
                                                const standardWeight = item.products?.weight_per_unit || 1
                                                const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)
                                                const totalWeight = editData ? editData.totalWeight : (item.actual_weight ?? (item.quantity * standardWeight))
                                                const displayWeight = isPieceBased ? (totalWeight / (displayQty || 1)) : totalWeight
                                                const initialWeight = item.actual_weight ?? (item.quantity * standardWeight)
                                                const hasChanged = Math.abs(totalWeight - initialWeight) > 0.0001

                                                const rowTotalPrice = item.products?.is_price_per_kilo
                                                    ? (totalWeight * item.price_snapshot)
                                                    : (standardWeight > 0 && isPieceBased)
                                                        ? (totalWeight * (item.price_snapshot / standardWeight))
                                                        : (displayQty * item.price_snapshot)

                                                return (
                                                    <div key={item.id} className={`border rounded-lg p-3 space-y-3 transition-colors ${item.is_completed ? 'bg-green-50/50 border-green-100' : 'bg-muted/10'}`}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-start gap-2">
                                                                {!isCompleted && (
                                                                    <button
                                                                        onClick={() => handleToggleCompletion(item.id, item.is_completed)}
                                                                        className={`mt-0.5 transition-colors ${item.is_completed ? 'text-green-600' : 'text-muted-foreground hover:text-primary'}`}
                                                                    >
                                                                        <CheckCircle2 className={`h-5 w-5 ${item.is_completed ? 'fill-green-600/10' : ''}`} />
                                                                    </button>
                                                                )}
                                                                <div className={`font-bold text-sm ${item.is_completed ? 'text-green-900 line-through opacity-70' : ''}`}>
                                                                    {item.products?.name}
                                                                    {isCheese && (
                                                                        <Badge variant="outline" className="ml-2 text-[10px] text-blue-600 border-blue-200 bg-blue-50">Kaas</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold">{displayQty} {item.products?.unit_label}</div>
                                                                <div className="text-[10px] text-muted-foreground">{formatPrice(item.price_snapshot)} / {item.products?.unit_label}</div>
                                                                {isCheese && (
                                                                    <div className="text-[10px] text-muted-foreground flex flex-col items-end gap-0.5 mt-1">
                                                                        <span>Standaard: {Number(standardWeight.toFixed(3))} kg/st</span>
                                                                        {typeof item.actual_weight === 'number' && isFinite(item.actual_weight) && (
                                                                            <span className="text-orange-600 font-bold flex items-center gap-1 bg-orange-50 px-1 rounded border border-orange-100">
                                                                                <Scale className="h-2 w-2" /> Aangepast: {Number((item.actual_weight / (displayQty || 1)).toFixed(3))}kg/st
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isWeightAdjustable ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative flex-1">
                                                                        <Scale className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                        <Input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            value={editData?.displayTotalWeight ?? Number(displayWeight.toFixed(3)).toString()}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value
                                                                                initEditing(item)
                                                                                handleWeightChange(item.id, val)
                                                                            }}
                                                                            className={`w-full h-10 pl-8 text-right font-bold border-2 ${hasChanged ? 'border-orange-500' : item.actual_weight !== null ? 'border-blue-400 bg-blue-50/30' : 'border-input'}`}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase">kg Totaal</span>
                                                                    {isPieceBased && (
                                                                        <div className="text-[10px] font-bold text-muted-foreground ml-2 whitespace-nowrap">
                                                                            ({displayQty} x {standardWeight}kg)
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex justify-between items-center border-t pt-2">
                                                                    <div className="text-xs font-bold text-primary">Subtotaal: {formatPrice(rowTotalPrice)}</div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            disabled={!editData || saving === item.id || !hasChanged}
                                                                            onClick={() => saveWeight(item.id, standardWeight, item.products?.unit_label)}
                                                                            className="h-8 px-4"
                                                                        >
                                                                            {saving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                                        </Button>
                                                                        {hasChanged && (
                                                                            <Button variant="ghost" size="sm" onClick={() => setEditingItems(prev => {
                                                                                const newState = { ...prev };
                                                                                delete newState[item.id];
                                                                                return newState;
                                                                            })} className="h-8 text-destructive" title="Wijzigingen ongedaan maken">
                                                                                <RotateCcw className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                        {item.actual_weight !== null && !hasChanged && !editData?.isExpanded && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => resetWeight(item.id, item.products?.unit_label)}
                                                                                className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                                title="Herstellen naar standaard productgewicht"
                                                                            >
                                                                                <RotateCcw className="h-3 w-3" />
                                                                                <span className="text-[10px] ml-1">Reset</span>
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
                                                    <th className="py-3 px-4 text-left font-semibold w-10">Vink</th>
                                                    <th className="py-3 px-4 text-left font-semibold">Product</th>
                                                    <th className="py-3 px-4 text-center font-semibold">Originele Bestelling</th>
                                                    <th className="py-3 px-4 text-right font-semibold">Aanpassen Gewicht / Aantal</th>
                                                    <th className="py-3 px-4 text-right font-semibold w-24">Actie</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {[...order.order_items].sort((a, b) => (a.products?.sort_order ?? 999) - (b.products?.sort_order ?? 999)).map((item) => {
                                                    const isCheese = item.products?.category === 'Kaas'
                                                    const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                                                    const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)
                                                    const isWeightAdjustable = !isCompleted && (isCheese || unitLabel === 'kg' || item.products?.is_price_per_kilo)

                                                    const editData = editingItems[item.id]
                                                    const standardWeight = item.products?.weight_per_unit || 1
                                                    const displayQty = getDisplayQuantity(item.quantity, item.products?.unit_label)
                                                    const totalWeight = editData ? editData.totalWeight : (item.actual_weight ?? (item.quantity * standardWeight))
                                                    const displayWeight = isPieceBased ? (totalWeight / (displayQty || 1)) : totalWeight
                                                    const initialWeight = item.actual_weight ?? (item.quantity * standardWeight)
                                                    const hasChanged = Math.abs(totalWeight - initialWeight) > 0.0001

                                                    const rowTotalPrice = item.products?.is_price_per_kilo
                                                        ? (totalWeight * item.price_snapshot)
                                                        : (standardWeight > 0 && isPieceBased)
                                                            ? (totalWeight * (item.price_snapshot / standardWeight))
                                                            : (displayQty * item.price_snapshot)

                                                    return (
                                                        <tr key={item.id} className={`transition-colors ${item.is_completed ? 'bg-green-50/30 hover:bg-green-50/50' : 'hover:bg-muted/10'}`}>
                                                            <td className="py-4 px-4 text-center">
                                                                {!isCompleted && (
                                                                    <button
                                                                        onClick={() => handleToggleCompletion(item.id, item.is_completed)}
                                                                        className={`transition-colors ${item.is_completed ? 'text-green-600' : 'text-muted-foreground hover:text-primary'}`}
                                                                        title={item.is_completed ? "Markeer als niet gereed" : "Markeer als gereed"}
                                                                    >
                                                                        <CheckCircle2 className={`h-5 w-5 ${item.is_completed ? 'fill-green-600/10' : ''}`} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className={`py-4 px-4 font-medium ${item.is_completed ? 'text-green-900/70 line-through decoration-green-500/50' : ''}`}>
                                                                {item.products?.name}
                                                                {isCheese && (
                                                                    <Badge variant="outline" className="ml-2 text-[10px] text-blue-600 border-blue-200 bg-blue-50">Kaas</Badge>
                                                                )}
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-semibold text-base">{displayQty} {item.products?.unit_label}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{formatPrice(item.price_snapshot)} / {item.products?.unit_label}</span>
                                                                    {isCheese && (
                                                                        <div className="flex flex-col mt-2 gap-1 w-full max-w-[140px]">
                                                                            <span className="text-[10px] text-muted-foreground bg-muted/50 p-1 rounded border border-border/50">
                                                                                Standaard: {Number(standardWeight.toFixed(3))} kg/st
                                                                            </span>
                                                                            {typeof item.actual_weight === 'number' && isFinite(item.actual_weight) && (
                                                                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 p-1 rounded flex items-center gap-1 justify-center border border-blue-100 shadow-sm">
                                                                                    <Scale className="h-2.5 w-2.5" /> Aangepast: {Number((item.actual_weight / (displayQty || 1)).toFixed(3))}kg/st
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="py-4 px-4 text-right">
                                                                <div className="flex flex-col items-end gap-2">
                                                                    {isWeightAdjustable ? (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="relative group">
                                                                                    <Scale className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                                                    <Input
                                                                                        type="text"
                                                                                        inputMode="decimal"
                                                                                        value={editData?.displayTotalWeight ?? Number(displayWeight.toFixed(3)).toString()}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value
                                                                                            initEditing(item)
                                                                                            handleWeightChange(item.id, val)
                                                                                        }}
                                                                                        className={`w-32 h-10 pl-8 text-right font-bold text-lg border-2 ${hasChanged ? 'border-orange-500 focus:ring-orange-500' : item.actual_weight !== null ? 'border-blue-400 bg-blue-50/30' : 'border-input'}`}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-sm font-bold text-muted-foreground uppercase">kg Totaal</span>
                                                                                {isPieceBased && (
                                                                                    <div className="text-[10px] font-bold text-muted-foreground ml-2 whitespace-nowrap">
                                                                                        ({displayQty} x {standardWeight}kg)
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center gap-2">
                                                                                {hasChanged && (
                                                                                    <span className="text-[10px] text-orange-600 font-bold">
                                                                                        Verschil: {(((totalWeight / initialWeight) - 1) * 100).toFixed(1)}%
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
                                                                            onClick={() => saveWeight(item.id, standardWeight, item.products?.unit_label)}
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
                                                                        {item.actual_weight !== null && !hasChanged && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-7 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50 w-full mt-1"
                                                                                onClick={() => resetWeight(item.id, item.products?.unit_label)}
                                                                            >
                                                                                <RotateCcw className="h-3 w-3 mr-1" />
                                                                                Terug naar Standaard
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
                                                    const standardWeight = item.products?.weight_per_unit || 1
                                                    const weight = editData ? editData.totalWeight : (item.actual_weight ?? (item.quantity * standardWeight))

                                                    const unitLabel = item.products?.unit_label?.toLowerCase() || ''
                                                    const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)
                                                    const isPerKilo = item.products?.is_price_per_kilo

                                                    if (isPerKilo) {
                                                        return sum + (weight * item.price_snapshot)
                                                    } else if (isPieceBased && standardWeight > 0) {
                                                        return sum + (weight * (item.price_snapshot / standardWeight))
                                                    } else {
                                                        const pieces = Math.round(item.quantity)
                                                        return sum + (pieces * item.price_snapshot)
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
