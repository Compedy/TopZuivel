'use client'

import { useState, useMemo, useEffect } from 'react'
import { Product, OrderWithItems } from '@/types'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateOrderMetadata, addOrderItem, removeOrderItem, updateOrderItemQuantity } from '@/app/admin/actions'
import { Plus, Trash2, Search, Loader2 } from 'lucide-react'

interface OrderEditorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    products: Product[]
    order: OrderWithItems
    onSuccess: () => void
}

export default function OrderEditor({
    open,
    onOpenChange,
    products,
    order,
    onSuccess
}: OrderEditorProps) {
    const [companyName, setCompanyName] = useState(order.company_name || '')
    const [email, setEmail] = useState(order.email || '')
    const [notes, setNotes] = useState(order.notes || '')
    const [weekNumber, setWeekNumber] = useState(order.week_number?.toString() || '')
    const [searchTerm, setSearchTerm] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Sync state when order changes or dialog opens
    useEffect(() => {
        if (open) {
            setCompanyName(order.company_name || '')
            setEmail(order.email || '')
            setNotes(order.notes || '')
            setWeekNumber(order.week_number?.toString() || '')
            setSearchTerm('')
        }
    }, [open, order])

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products
        const term = searchTerm.toLowerCase()
        return products.filter((p: Product) =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        )
    }, [products, searchTerm])

    const handleUpdateMetadata = async () => {
        setIsSubmitting(true)
        const result = await updateOrderMetadata(order.id, {
            company_name: companyName,
            email: email,
            notes: notes,
            week_number: parseInt(weekNumber) || null
        })
        setIsSubmitting(false)
        if (result.success) {
            onSuccess()
        } else {
            alert('Fout bij bijwerken: ' + result.error)
        }
    }

    const handleAddItem = async (product: Product) => {
        setIsSubmitting(true)
        const result = await addOrderItem(order.id, product.id, 1, product.price)
        setIsSubmitting(false)
        if (result.success) {
            onSuccess()
        } else {
            alert('Fout bij toevoegen item: ' + result.error)
        }
    }

    const handleRemoveItem = async (itemId: string) => {
        if (!confirm('Weet u zeker dat u dit item wilt verwijderen?')) return
        setIsSubmitting(true)
        const result = await removeOrderItem(itemId)
        setIsSubmitting(false)
        if (result.success) {
            onSuccess()
        } else {
            alert('Fout bij verwijderen item: ' + result.error)
        }
    }

    const handleQtyChange = async (itemId: string, newQty: number) => {
        if (newQty < 0) return
        const result = await updateOrderItemQuantity(itemId, newQty)
        if (result.success) {
            onSuccess()
        } else {
            alert('Fout bij wijzigen aantal: ' + result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>Bestelling Bewerken - #{order.id.slice(0, 8)}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company">Bedrijfsnaam</Label>
                            <Input
                                id="company"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="week">Week Nummer</Label>
                            <Input
                                id="week"
                                type="number"
                                value={weekNumber}
                                onChange={(e) => setWeekNumber(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Opmerking</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleUpdateMetadata} disabled={isSubmitting} size="sm">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Gegevens Opslaan
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                        {/* Product Picker */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm">Producten Toevoegen</h3>
                                <div className="relative w-48">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Zoek product..."
                                        className="pl-8 h-9 text-xs"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                                {filteredProducts.map((product: Product) => (
                                    <div key={product.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.category} • €{product.price.toFixed(2)} / {product.unit_label}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 rounded-full p-0"
                                            onClick={() => handleAddItem(product)}
                                            disabled={isSubmitting}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Current Items */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm">Bestelde Producten</h3>
                            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto bg-muted/10">
                                {order.order_items.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground text-xs italic">
                                        Geen producten in deze bestelling
                                    </div>
                                ) : (
                                    order.order_items.map((item) => (
                                        <div key={item.id} className="p-3 flex items-center justify-between bg-card">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{item.products?.name}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    €{item.price_snapshot.toFixed(2)} / {item.products?.unit_label}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="w-16 h-8 text-xs text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQtyChange(item.id, parseFloat(e.target.value) || 0)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={isSubmitting}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/20">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Sluiten</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
