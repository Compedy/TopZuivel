
'use client'

import { useState } from 'react'
import { Product } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProduct } from '@/app/admin/actions'
import { Loader2 } from 'lucide-react'

interface AdminProductListProps {
    initialProducts: Product[]
}

export default function AdminProductList({ initialProducts }: AdminProductListProps) {


    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-muted-foreground border-b bg-muted/40">
                    <div className="col-span-4">Naam</div>
                    <div className="col-span-2 text-right">Prijs</div>
                    <div className="col-span-2 text-right">Gewicht</div>
                    <div className="col-span-2 text-center">Actief</div>
                    <div className="col-span-2 text-right">Acties</div>
                </div>
                <div className="divide-y relative">
                    {initialProducts.map(product => (
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
            <div className="grid grid-cols-12 gap-4 p-4 items-center bg-accent/20 animate-in fade-in">
                <div className="col-span-4 text-sm font-medium">{product.name}</div>
                <div className="col-span-2">
                    <Input
                        type="number"
                        step="0.01"
                        value={data.price}
                        onChange={(e) => setData({ ...data, price: parseFloat(e.target.value) })}
                        className="h-8 text-right"
                    />
                </div>
                <div className="col-span-2">
                    <Input
                        type="number"
                        step="0.001"
                        value={data.weight_per_unit}
                        onChange={(e) => setData({ ...data, weight_per_unit: parseFloat(e.target.value) })}
                        className="h-8 text-right"
                    />
                </div>
                <div className="col-span-2 flex justify-center">
                    <Button
                        variant={data.is_active ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setData({ ...data, is_active: !data.is_active })}
                        className="h-6 text-xs"
                    >
                        {data.is_active ? 'Ja' : 'Nee'}
                    </Button>
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={loading}>X</Button>
                    <Button size="sm" onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Opslaan'}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-muted/50 transition-colors">
            <div className="col-span-4 font-medium">{product.name}</div>
            <div className="col-span-2 text-right">€{product.price.toFixed(2)}</div>
            <div className="col-span-2 text-right">{product.weight_per_unit} {product.unit_label}</div>
            <div className="col-span-2 text-center">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${product.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                    {product.is_active ? 'Actief' : 'Non-actief'}
                </span>
            </div>
            <div className="col-span-2 text-right">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
                    Bewerken
                </Button>
            </div>
        </div>
    )
}
