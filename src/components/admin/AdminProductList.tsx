
'use client'

import { useState } from 'react'
import { Product } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProduct, deleteProduct } from '@/app/admin/actions'
import { Loader2, Plus, Edit2, Save, X, Trash2 } from 'lucide-react'
import AddProductForm from './AddProductForm'

interface AdminProductListProps {
    initialProducts: Product[]
}

export default function AdminProductList({ initialProducts }: AdminProductListProps) {
    const [isAdding, setIsAdding] = useState(false)

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <h2 className="font-bold text-lg">Product Beheer</h2>
                {!isAdding && (
                    <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Product Toevoegen</span>
                        <span className="sm:hidden">Nieuw</span>
                    </Button>
                )}
            </div>

            {isAdding && (
                <AddProductForm
                    onSuccess={() => setIsAdding(false)}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            <div className="rounded-md border bg-card overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 font-medium text-sm text-muted-foreground border-b bg-muted/40">
                    <div className="col-span-4">Naam</div>
                    <div className="col-span-2 text-right">Prijs</div>
                    <div className="col-span-2 text-right">Gewicht</div>
                    <div className="col-span-2 text-center">Actief</div>
                    <div className="col-span-2 text-right">Acties</div>
                </div>
                <div className="divide-y relative">
                    {initialProducts.map((product: Product) => (
                        <ProductRow key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function ProductRow({ product }: { product: Product }) {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({
        price: product.price,
        weight_per_unit: product.weight_per_unit,
        is_active: product.is_active
    })

    const handleSave = async () => {
        setLoading(true)
        const result = await updateProduct(product.id, data)
        if (result.success) {
            setIsEditing(false)
        } else {
            alert('Fout bij opslaan: ' + result.error)
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!confirm(`Weet je zeker dat je "${product.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return

        setLoading(true)
        const result = await deleteProduct(product.id)
        if (!result.success) {
            alert('Fout bij verwijderen: ' + result.error)
        }
        setLoading(false)
    }

    if (isEditing) {
        return (
            <div className="p-3 bg-accent/10 border-l-4 border-primary animate-in fade-in space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                <div className="md:col-span-4 text-sm font-bold truncate">{product.name}</div>
                <div className="grid grid-cols-2 gap-3 md:contents">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Prijs (€)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={data.price}
                            onChange={(e) => setData({ ...data, price: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right text-xs"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Gewicht ({product.unit_label})</label>
                        <Input
                            type="number"
                            step="0.001"
                            value={data.weight_per_unit}
                            onChange={(e) => setData({ ...data, weight_per_unit: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-right text-xs"
                        />
                    </div>
                    <div className="flex flex-col md:col-span-2 gap-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground md:hidden">Status</label>
                        <Button
                            variant={data.is_active ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setData({ ...data, is_active: !data.is_active })}
                            className="h-8 md:h-7 text-[10px] w-full"
                        >
                            {data.is_active ? 'Actief' : 'Inactief'}
                        </Button>
                    </div>
                    <div className="flex md:justify-end gap-1.5 md:col-span-2 items-end md:items-center col-span-2">
                        <Button size="sm" variant="ghost" className="flex-1 md:flex-none h-8 px-2 text-xs" onClick={() => setIsEditing(false)} disabled={loading}>
                            <X className="h-4 w-4 mr-1 md:hidden" /> Annuleren
                        </Button>
                        <Button size="sm" className="flex-1 md:flex-none h-8 px-2 text-xs" onClick={handleSave} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    <Save className="h-4 w-4 mr-1 md:hidden" /> Opslaan
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="hover:bg-muted/30 transition-colors text-sm">
            <div className="flex items-center justify-between p-3 md:grid md:grid-cols-12 md:gap-4">
                <div className="md:col-span-4 font-bold md:font-medium text-sm md:text-sm truncate mr-2">{product.name}</div>

                {/* Desktop layout */}
                <div className="hidden md:block col-span-2 text-right">€{product.price.toFixed(2)}</div>
                <div className="hidden md:block col-span-2 text-right text-muted-foreground">{product.weight_per_unit} {product.unit_label}</div>
                <div className="hidden md:block col-span-2 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${product.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                        {product.is_active ? 'Actief' : 'Inactief'}
                    </span>
                </div>
                <div className="hidden md:flex col-span-2 text-right justify-end gap-2 text-right">
                    <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => setIsEditing(true)}>
                        Bewerken
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Mobile action button */}
                <div className="md:hidden flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Mobile info row */}
            <div className="flex items-center gap-4 px-3 pb-3 pt-0 md:hidden text-xs text-muted-foreground">
                <div className="font-bold text-foreground">€{product.price.toFixed(2)}</div>
                <div>{product.weight_per_unit} {product.unit_label}</div>
                <div className="ml-auto">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 ring-inset ${product.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                        {product.is_active ? 'Actief' : 'Inactief'}
                    </span>
                </div>
            </div>
        </div>
    )
}
