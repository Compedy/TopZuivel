
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addProduct } from '@/app/admin/actions'
import { Loader2 } from 'lucide-react'

interface AddProductFormProps {
    onSuccess: () => void
    onCancel: () => void
}

export default function AddProductForm({ onSuccess, onCancel }: AddProductFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        category: 'Zuivel',
        type_group: '',
        price: '',
        unit_label: 'stuk',
        weight_per_unit: '',
        is_active: true
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await addProduct({
            name: formData.name,
            category: formData.category,
            type_group: formData.type_group,
            price: parseFloat(formData.price),
            unit_label: formData.unit_label,
            weight_per_unit: parseFloat(formData.weight_per_unit),
            is_active: formData.is_active
        } as any)

        if (result.success) {
            onSuccess()
        } else {
            alert('Fout bij toevoegen product: ' + result.error)
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold text-lg">Nieuw Product Toevoegen</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Naam</Label>
                    <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Bijv. Jonge Gouda"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Categorie</Label>
                    <Select
                        value={formData.category}
                        onValueChange={(val: string) => setFormData({ ...formData, category: val })}
                    >
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Selecteer categorie" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Kaas">Kaas</SelectItem>
                            <SelectItem value="Zuivel">Zuivel</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type_group">Type Groep</Label>
                    <Input
                        id="type_group"
                        value={formData.type_group}
                        onChange={e => setFormData({ ...formData, type_group: e.target.value })}
                        placeholder="Bijv. Goudse Kaas"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <Label htmlFor="price">Prijs (€)</Label>
                        <Input
                            id="price"
                            type="text"
                            inputMode="decimal"
                            required
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value.replace(',', '.') })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unit_label">Eenheid</Label>
                        <Input
                            id="unit_label"
                            required
                            value={formData.unit_label}
                            onChange={e => setFormData({ ...formData, unit_label: e.target.value })}
                            placeholder="stuk, kg, blok"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="weight_per_unit">Gewicht (per eenheid)</Label>
                    <Input
                        id="weight_per_unit"
                        type="text"
                        inputMode="decimal"
                        value={formData.weight_per_unit}
                        onChange={e => setFormData({ ...formData, weight_per_unit: e.target.value.replace(',', '.') })}
                    />
                </div>

                <div className="flex items-center space-x-2 pt-8">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="is_active">Actief in winkel</Label>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    Annuleren
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Product Toevoegen
                </Button>
            </div>
        </form>
    )
}
