
'use client'

import { useState } from 'react'
import { Product } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProduct } from '@/app/admin/actions'
import { Loader2, Plus } from 'lucide-react'
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

    if (isEditing) {
        return (
            <div className="p-4 bg-accent/20 animate-in fade-in space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                <div className="md:col-span-4 text-sm font-bold md:font-medium">{product.name}</div>
                <div className="grid grid-cols-2 gap-4 md:contents">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] uppercase text-muted-foreground md:hidden">Prijs (€)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={data.price}
                            onChange={(e) => setData({ ...data, price: parseFloat(e.target.value) })}
                            className="h-9 md:h-8 text-right"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] uppercase text-muted-foreground md:hidden">Gewicht ({product.unit_label})</label>
                        <Input
                            type="number"
                            step="0.001"
                            value={data.weight_per_unit}
                            onChange={(e) => setData({ ...data, weight_per_unit: parseFloat(e.target.value) })}
                            className="h-9 md:h-8 text-right"
                        />
                    </div>
                    <div className="flex flex-col md:flex-row md:justify-center md:col-span-2 gap-1">
                        <label className="text-[10px] uppercase text-muted-foreground md:hidden">Status</label>
                        <Button
                            variant={data.is_active ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setData({ ...data, is_active: !data.is_active })}
                            className="h-9 md:h-6 text-xs"
                        >
                            {data.is_active ? 'Actief' : 'Inactief'}
                        </Button>
                    </div>
                    <div className="flex md:justify-end gap-2 md:col-span-2 items-end md:items-center">
                        <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => setIsEditing(false)} disabled={loading}>Annuleer</Button>
                        <Button size="sm" className="flex-1 md:flex-none" onClick={handleSave} disabled={loading}>
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Opslaan'}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-4 items-start md:items-center text-sm hover:bg-muted/50 transition-colors">
            <div className="md:col-span-4 font-bold md:font-medium text-base md:text-sm">{product.name}</div>
            <div className="flex w-full justify-between items-center md:contents">
                <div className="md:col-span-2 md:text-right font-semibold md:font-normal">€{product.price.toFixed(2)}</div>
                <div className="md:col-span-2 md:text-right text-muted-foreground">{product.weight_per_unit} {product.unit_label}</div>
                <div className="md:col-span-2 flex justify-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${product.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                        {product.is_active ? 'Actief' : 'Inactief'}
                    </span>
                </div>
                <div className="md:col-span-2 md:text-right w-full md:w-auto pt-2 md:pt-0">
                    <Button variant="outline" size="sm" className="w-full md:w-auto h-8 text-xs" onClick={() => setIsEditing(true)}>
                        Bewerken
                    </Button>
                </div>
            </div>
        </div>
    )
}
