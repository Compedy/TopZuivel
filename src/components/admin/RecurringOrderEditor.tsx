
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Product, RecurringOrder, RecurringOrderItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertRecurringOrder } from '@/app/admin/actions'
import { Plus, Trash2, Search, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecurringOrderEditorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    products: Product[]
    existingOrder?: RecurringOrder & { recurring_order_items: RecurringOrderItem[] }
    onSuccess: () => void
}

export default function RecurringOrderEditor({
    open,
    onOpenChange,
    products,
    existingOrder,
    onSuccess
}: RecurringOrderEditorProps) {
    const [companyName, setCompanyName] = useState(existingOrder?.company_name || '')
    const [email, setEmail] = useState(existingOrder?.email || '')
    const [priceModifier, setPriceModifier] = useState(existingOrder?.price_modifier?.toString() || '0')
    const [cart, setCart] = useState<Record<string, number>>(
        existingOrder?.recurring_order_items.reduce((acc: Record<string, number>, item: RecurringOrderItem) => ({
            ...acc,
            [item.product_id]: item.quantity
        }), {}) || {}
    )
    const [searchTerm, setSearchTerm] = useState('')
    const [displayCart, setDisplayCart] = useState<Record<string, string>>({})
    const [interval, setInterval] = useState<'weekly' | 'bi-weekly' | 'monthly' | 'manual'>(existingOrder?.interval || 'weekly')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Sync state when existingOrder changes or dialog opens
    useEffect(() => {
        if (open) {
            setCompanyName(existingOrder?.company_name || '')
            setEmail(existingOrder?.email || '')
            setPriceModifier(existingOrder?.price_modifier?.toString() || '0')
            const initialCart = existingOrder?.recurring_order_items.reduce((acc, item) => ({
                ...acc,
                [item.product_id]: item.quantity
            }), {}) || {}
            setCart(initialCart)
            setDisplayCart(Object.entries(initialCart).reduce((acc, [id, qty]) => ({
                ...acc,
                [id]: (qty as number).toString()
            }), {}))
            setInterval(existingOrder?.interval || 'weekly')
            setSearchTerm('')
        }
    }, [open, existingOrder])

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products
        const term = searchTerm.toLowerCase()
        return products.filter((p: Product) =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        )
    }, [products, searchTerm])

    const handleQuantityChange = (productId: string, qty: number, displayVal?: string) => {
        setCart((prev: Record<string, number>) => {
            const next = { ...prev }
            if (qty <= 0) delete next[productId]
            else next[productId] = qty
            return next
        })
        if (displayVal !== undefined) {
            setDisplayCart(prev => ({
                ...prev,
                [productId]: displayVal
            }))
        }
    }

    const handleSubmit = async () => {
        if (!companyName || !email) {
            alert('Bedrijfsnaam en e-mail zijn verplicht')
            return
        }

        const items = Object.entries(cart).map(([product_id, quantity]: [string, number]) => ({
            product_id,
            quantity
        }))

        if (items.length === 0) {
            alert('Voeg ten minste één product toe')
            return
        }

        setIsSubmitting(true)
        const result = await upsertRecurringOrder(
            {
                id: existingOrder?.id,
                company_name: companyName,
                email: email,
                price_modifier: parseFloat(priceModifier.replace(',', '.')) || 0,
                is_active: existingOrder?.is_active ?? true,
                interval: interval
            },
            items
        )
        setIsSubmitting(false)

        if (result.success) {
            onSuccess()
            onOpenChange(false)
        } else {
            alert('Fout bij opslaan: ' + result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>{existingOrder ? 'Periodieke Bestelling Bewerken' : 'Nieuwe Periodieke Bestelling'}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company">Bedrijfsnaam</Label>
                            <Input
                                id="company"
                                value={companyName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                                placeholder="Bijv. Restaurant De Kroon"
                                disabled={!!existingOrder}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                placeholder="factuur@bedrijf.nl"
                                disabled={!!existingOrder}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="interval">Interval</Label>
                            <Select
                                value={interval}
                                onValueChange={(val: any) => setInterval(val)}
                            >
                                <SelectTrigger id="interval">
                                    <SelectValue placeholder="Selecteer interval" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="weekly">Wekelijks</SelectItem>
                                    <SelectItem value="bi-weekly">Om de week</SelectItem>
                                    <SelectItem value="monthly">Eén keer per maand</SelectItem>
                                    <SelectItem value="manual">Handmatig (nooit automatisch)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground italic">
                                {interval === 'bi-weekly' && "Elke even week."}
                                {interval === 'monthly' && "Laatste volle week van de maand."}
                                {interval === 'manual' && "Wordt nooit automatisch aangemaakt."}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="modifier" className="flex items-center gap-1">
                                <Percent className="h-3 w-3" /> Prijs Modificatie (%)
                            </Label>
                            <Input
                                id="modifier"
                                type="text"
                                inputMode="decimal"
                                value={priceModifier}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const rawVal = e.target.value.replace(',', '.')
                                    setPriceModifier(rawVal)
                                }}
                                placeholder="Bijv. -10 voor korting, 5 voor premium"
                            />
                            <p className="text-[10px] text-muted-foreground">Positief = duurder, Negatief = goedkoper</p>
                        </div>
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
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
                                            onClick={() => handleQuantityChange(product.id, (cart[product.id] || 0) + 1)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Selected List */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm">Geselecteerde Producten</h3>
                            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto bg-muted/10">
                                {Object.keys(cart).length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground text-xs italic">
                                        Nog geen producten geselecteerd
                                    </div>
                                ) : (
                                    Object.entries(cart).map(([pid, qty]: [string, number]) => {
                                        const product = products.find((p: Product) => p.id === pid)
                                        if (!product) return null
                                        return (
                                            <div key={pid} className="p-3 flex items-center justify-between bg-card">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{product.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{product.unit_label}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="w-16 h-8 text-xs text-right"
                                                        value={displayCart[pid] ?? qty.toString()}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const val = parseFloat(e.target.value.replace(',', '.'))
                                                            handleQuantityChange(pid, isNaN(val) ? 0 : val, e.target.value)
                                                        }}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleQuantityChange(pid, 0)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/20">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Opslaan...' : 'Opslaan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
