
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addProduct } from '@/app/admin/actions'
import { Loader2, Plus, X } from 'lucide-react'
import { Product } from '@/types'

interface AddProductFormProps {
    products: Product[]
    onSuccess: () => void
    onCancel: () => void
}

type ProductType = 'kilo' | 'prepacked' | 'fixed'

export default function AddProductForm({ products, onSuccess, onCancel }: AddProductFormProps) {
    const [loading, setLoading] = useState(false)
    const [productType, setProductType] = useState<ProductType>('fixed')
    const [showNewCategory, setShowNewCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        category: 'Zuivel',
        price: '',
        unit_label: 'stuk',
        weight_per_unit: '',
        is_active: true
    })

    const categories = useMemo(() => {
        const unique = Array.from(new Set(products.map(p => p.category)))
        return unique.sort()
    }, [products])

    const handleTypeChange = (type: ProductType) => {
        setProductType(type)
        if (type === 'kilo') {
            setFormData(prev => ({ ...prev, unit_label: 'kg', weight_per_unit: '1' }))
        } else if (type === 'prepacked') {
            setFormData(prev => ({ ...prev, unit_label: 'st', weight_per_unit: '0.500' }))
        } else {
            setFormData(prev => ({ ...prev, unit_label: 'st', weight_per_unit: '0' }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const finalCategory = showNewCategory ? newCategoryName : formData.category
        if (!finalCategory) {
            alert('Selecteer of voer een categorie in')
            setLoading(false)
            return
        }

        const result = await addProduct({
            name: formData.name,
            category: finalCategory,
            price: parseFloat(formData.price),
            unit_label: formData.unit_label,
            weight_per_unit: productType === 'kilo' ? 1 : Math.round((parseFloat(formData.weight_per_unit) || 0) * 1000) / 1000,
            is_price_per_kilo: productType === 'kilo',
            is_active: formData.is_active,
            type_group: 'Algemeen' // Defaulting to Algemeen as requested to remove from UI
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
                <div className="space-y-2 md:col-span-2">
                    <Label>Product Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            type="button"
                            variant={productType === 'kilo' ? 'default' : 'outline'}
                            onClick={() => handleTypeChange('kilo')}
                            className="text-xs h-9"
                        >
                            Per Kilo
                        </Button>
                        <Button
                            type="button"
                            variant={productType === 'prepacked' ? 'default' : 'outline'}
                            onClick={() => handleTypeChange('prepacked')}
                            className="text-xs h-9"
                        >
                            Gevacumeerd
                        </Button>
                        <Button
                            type="button"
                            variant={productType === 'fixed' ? 'default' : 'outline'}
                            onClick={() => handleTypeChange('fixed')}
                            className="text-xs h-9"
                        >
                            Vaste Prijs
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                        {productType === 'kilo' && "Product wordt per kilo verkocht. Prijs is per kg."}
                        {productType === 'prepacked' && "Per stuk verkocht, maar gewicht kan per order worden aangepast."}
                        {productType === 'fixed' && "Vaste prijs per stuk. Gewicht kan niet worden aangepast."}
                    </p>
                </div>

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
                    {!showNewCategory ? (
                        <div className="flex gap-2">
                            <Select
                                value={formData.category}
                                onValueChange={(val: string) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger id="category" className="flex-1">
                                    <SelectValue placeholder="Selecteer categorie" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setShowNewCategory(true)}
                                title="Nieuwe categorie"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nieuwe categorienaam"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                autoFocus
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setShowNewCategory(false)
                                    setNewCategoryName('')
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
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
                            placeholder="0.00"
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
                            disabled={productType === 'kilo'}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="weight_per_unit">
                        {productType === 'kilo' ? "Standaard Gewicht (1kg)" : "Standaard Gewicht per stuk"}
                    </Label>
                    <Input
                        id="weight_per_unit"
                        type="text"
                        inputMode="decimal"
                        value={formData.weight_per_unit}
                        onChange={e => setFormData({ ...formData, weight_per_unit: e.target.value.replace(',', '.') })}
                        disabled={productType === 'kilo' || productType === 'fixed'}
                        placeholder="0.000"
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
