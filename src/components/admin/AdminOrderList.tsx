'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { OrderWithItems, Product } from '@/types'
import { ChevronDown, ChevronUp, Scale, Save, Loader2, ListTree, RotateCcw, CheckCircle2, FileText, Search, Pencil } from 'lucide-react'
import {
    updateOrderItemQuantity,
    updateOrderStatus,
    updateOrderMetadata,
    addOrderItem,
    removeOrderItem,
    toggleOrderItemCompletion,
    deleteOrder
} from '@/app/admin/actions'
import { generateOrderPDF, getDisplayQuantity } from '@/lib/pdf-utils'
import OrderSearch from './OrderSearch'
import OrderCard from './OrderCard'
import OrderEditor from './OrderEditor'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface AdminOrderListProps {
    initialOrders: OrderWithItems[]
    products: Product[]
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
    const [optimisticCompletion, setOptimisticCompletion] = useState<Record<string, boolean>>({})
    const [isDeleting, setIsDeleting] = useState(false)

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
        const newStatus = !currentStatus

        // Optimistic update
        setOptimisticCompletion(prev => ({ ...prev, [itemId]: newStatus }))

        const result = await toggleOrderItemCompletion(itemId, newStatus)
        if (!result.success) {
            // Revert on failure
            setOptimisticCompletion(prev => {
                const newState = { ...prev }
                delete newState[itemId]
                return newState
            })
            toast.error('Fout bij bijwerken status: ' + result.error)
        } else {
            router.refresh()
            // We keep the optimistic status until the refresh is complete
            // (initialOrders update will naturally override it if we manage it correctly, 
            // but for now, the render logic will prioritize local state)
        }
    }

    const initEditing = (item: OrderWithItems['order_items'][number]) => {
        if (editingItems[item.id]) return

        const standardWeight = item.products?.weight_per_unit || 1
        const unitLabel = item.products?.unit_label?.toLowerCase() || ''
        const isPieceBased = ['st', 'stuk', 'blok'].includes(unitLabel)

        const totalWeight = item.actual_weight ?? (item.quantity * standardWeight)

        const unitCount = Math.max(1, Math.ceil(item.quantity))
        const units = Array(unitCount).fill(standardWeight)

        if (item.quantity % 1 !== 0 && unitCount > 1) {
            const sumOfOthers = (unitCount - 1) * standardWeight
            units[unitCount - 1] = Math.max(0, totalWeight - sumOfOthers)
        }

        const displayTotalWeight = Number(totalWeight.toFixed(3)).toString()

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
            const totalWeight = isNaN(num) ? 0 : Math.round(num * 1000) / 1000

            // Redistribute total weight evenly across units
            const unitCount = item.units.length
            const newUnits = Array(unitCount).fill(0)
            if (unitCount > 0) {
                const avg = totalWeight / unitCount
                for (let i = 0; i < unitCount; i++) {
                    newUnits[i] = Math.round(avg * 1000) / 1000
                }
                // Adjust last unit for rounding errors
                const sumOthers = newUnits.slice(0, -1).reduce((a, b) => a + b, 0)
                newUnits[unitCount - 1] = Math.round((totalWeight - sumOthers) * 1000) / 1000
            }

            return {
                ...prev,
                [itemId]: {
                    ...item,
                    displayTotalWeight: displayVal,
                    totalWeight: totalWeight,
                    units: newUnits,
                    displayUnits: newUnits.map(u => Number(u.toFixed(3)).toString())
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
            const roundedTotal = Math.round(newTotal * 1000) / 1000

            return {
                ...prev,
                [itemId]: {
                    ...item,
                    units: newUnits,
                    displayUnits: newDisplayUnits,
                    totalWeight: roundedTotal,
                    displayTotalWeight: Number(roundedTotal.toFixed(3)).toString()
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
            toast.error('Fout bij herstellen: ' + result.error)
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
            toast.error('Fout bij opslaan: ' + result.error)
        }
        setSaving(null)
    }

    const generatePDF = async (order: OrderWithItems) => {
        try {
            await generateOrderPDF(order)
        } catch (err) {
            console.error('General PDF error:', err)
            toast.error('Fout bij het genereren van de PDF.')
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
                router.refresh()
            } else {
                toast.error('Fout bij afronden bestelling: ' + result.error)
            }
        } catch (error) {
            toast.error('Systeemfout bij afronden bestelling.')
            console.error(error)
        } finally {
            setCompleting(null)
        }
    }

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Weet u zeker dat u deze bestelling permanent wilt verwijderen?')) return

        setIsDeleting(true)
        const result = await deleteOrder(orderId)
        setIsDeleting(false)

        if (result.success) {
            router.refresh()
        } else {
            toast.error('Fout bij verwijderen bestelling: ' + result.error)
        }
    }

    return (
        <div className="space-y-6 relative">
            {isDeleting && (
                <div className="fixed inset-0 bg-background/60 backdrop-blur-[2px] z-[100] flex items-center justify-center">
                    <div className="bg-card p-6 rounded-xl shadow-2xl border flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="font-bold text-lg">Bestelling Verwijderen</p>
                            <p className="text-sm text-muted-foreground">Even geduld, de bestelling wordt permanent verwijderd...</p>
                        </div>
                    </div>
                </div>
            )}
            <OrderSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showCompleted={showCompleted}
                setShowCompleted={setShowCompleted}
            />

            {filteredOrders.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">Geen bestellingen gevonden.</CardContent>
                </Card>
            ) : (
                filteredOrders.map(order => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        isExpanded={expandedOrder === order.id}
                        onToggleExpand={() => toggleOrder(order.id)}
                        onEdit={() => {
                            setEditingOrderId(order.id)
                            setIsEditorOpen(true)
                        }}
                        onDelete={() => handleDeleteOrder(order.id)}
                        onComplete={() => completeOrder(order)}
                        formatDate={formatDate}
                        formatPrice={formatPrice}
                        editingItems={editingItems}
                        optimisticCompletion={optimisticCompletion}
                        saving={saving}
                        completing={completing}
                        handlers={{
                            handleToggleCompletion,
                            handleWeightChange,
                            handleSaveWeight: (item, std) => saveWeight(item.id, std, item.products?.unit_label),
                            handleResetWeight: resetWeight,
                            handleCancelEdit: (itemId) => setEditingItems(prev => {
                                const newState = { ...prev }
                                delete newState[itemId]
                                return newState
                            }),
                            handleInitEditing: initEditing
                        }}
                    />
                ))
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
