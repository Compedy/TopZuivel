
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Product } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProduct, deleteProduct, updateProductSortOrder } from '@/app/admin/actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Edit2, Save, X, Trash2, FileText, GripVertical } from 'lucide-react'
import AddProductForm from './AddProductForm'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface AdminProductListProps {
    initialProducts: Product[]
}

export default function AdminProductList({ initialProducts }: AdminProductListProps) {
    const router = useRouter()
    const [isAdding, setIsAdding] = useState(false)
    const [products, setProducts] = useState(initialProducts)

    useEffect(() => {
        setProducts(initialProducts)
    }, [initialProducts])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Extract unique categories for the editors
    const categories = useMemo(() => {
        const unique = Array.from(new Set(initialProducts.map(p => p.category)))
        return unique.sort()
    }, [initialProducts])

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = products.findIndex((p) => p.id === active.id)
            const newIndex = products.findIndex((p) => p.id === over.id)

            const newProducts = arrayMove(products, oldIndex, newIndex)
            setProducts(newProducts)

            // Calculate new sort orders
            const updates = newProducts.map((p, index) => ({
                id: p.id,
                sort_order: index + 1
            }))

            const result = await updateProductSortOrder(updates)
            if (!result.success) {
                toast.error('Fout bij herordenen: ' + result.error)
                setProducts(initialProducts) // Revert on failure
            } else {
                router.refresh()
            }
        }
    }

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
                    products={initialProducts}
                    onSuccess={() => {
                        setIsAdding(false)
                        router.refresh()
                    }}
                    onCancel={() => setIsAdding(false)}
                />
            )}

            <div className="rounded-md border bg-card overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 font-medium text-sm text-muted-foreground border-b bg-muted/40">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Naam / Categorie</div>
                    <div className="col-span-2 text-right">Prijs</div>
                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-center">Actief</div>
                    <div className="col-span-2 text-right">Acties</div>
                </div>
                <div className="divide-y relative">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={products.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {products.map((product: Product) => (
                                <SortableProductRow key={product.id} product={product} categories={categories} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    )
}

function SortableProductRow({ product, categories }: { product: Product, categories: string[] }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: product.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-card">
            <ProductRow product={product} categories={categories} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
    )
}

function ProductRow({ product, categories, dragHandleProps }: { product: Product, categories: string[], dragHandleProps?: Record<string, unknown> }) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({
        name: product.name,
        price: product.price,
        weight_per_unit: product.weight_per_unit,
        is_active: product.is_active,
        category: product.category,
        is_price_per_kilo: product.is_price_per_kilo
    })

    const handleSave = async () => {
        setLoading(true)
        const result = await updateProduct(product.id, data)
        if (result.success) {
            setIsEditing(false)
            router.refresh()
        } else {
            toast.error('Fout bij opslaan: ' + result.error)
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!confirm(`Weet je zeker dat je "${product.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return

        setLoading(true)
        const result = await deleteProduct(product.id)
        if (!result.success) {
            toast.error('Fout bij verwijderen: ' + result.error)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    if (isEditing) {
        return (
            <div className="p-3 bg-accent/10 border-l-4 border-primary animate-in fade-in space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                <div className="md:col-span-1 hidden md:flex justify-center">
                    <GripVertical className="h-5 w-5 text-muted-foreground/30 cursor-not-allowed" />
                </div>
                <div className="md:col-span-3 flex flex-col gap-2">
                    <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Product Naam</label>
                        <Input
                            value={data.name}
                            onChange={(e) => setData({ ...data, name: e.target.value })}
                            className="h-8 text-xs font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Categorie</label>
                        <Select
                            value={data.category}
                            onValueChange={(val: string) => setData({ ...data, category: val })}
                        >
                            <SelectTrigger className="h-8 text-[10px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
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
                        <label className="text-[9px] uppercase font-bold text-muted-foreground">Type</label>
                        <Select
                            value={data.is_price_per_kilo ? 'kilo' : data.weight_per_unit > 0 ? 'prepacked' : 'fixed'}
                            onValueChange={(val) => {
                                if (val === 'kilo') {
                                    setData({ ...data, is_price_per_kilo: true, weight_per_unit: 1 })
                                } else if (val === 'prepacked') {
                                    setData({ ...data, is_price_per_kilo: false, weight_per_unit: data.weight_per_unit || 0.5 })
                                } else {
                                    setData({ ...data, is_price_per_kilo: false, weight_per_unit: 0 })
                                }
                            }}
                        >
                            <SelectTrigger className="h-8 text-[10px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="kilo">Per Kilo</SelectItem>
                                <SelectItem value="prepacked">Verpakt</SelectItem>
                                <SelectItem value="fixed">Vast</SelectItem>
                            </SelectContent>
                        </Select>
                        {data.weight_per_unit > 0 && !data.is_price_per_kilo && (
                            <div className="flex items-center gap-1 mt-1">
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={data.weight_per_unit}
                                    onChange={(e) => setData({ ...data, weight_per_unit: Math.round((parseFloat(e.target.value) || 0) * 1000) / 1000 })}
                                    className="h-6 text-right text-[10px] py-0 px-1 w-16"
                                />
                                <span className="text-[9px] text-muted-foreground">kg</span>
                            </div>
                        )}
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
                    <div className="flex md:justify-end gap-1.5 md:col-span-12 items-end md:items-center col-span-2 pt-2 border-t mt-2">
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
                <div className="md:col-span-1 flex items-center justify-center p-2 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors" style={{ touchAction: 'none' }} {...dragHandleProps}>
                    <GripVertical className="h-4 w-4" />
                </div>
                <div className="md:col-span-3 flex flex-col truncate mr-2">
                    <span className="font-bold md:font-medium text-sm truncate">{product.name}</span>
                    <span className="text-[10px] text-muted-foreground">{product.category}</span>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:block col-span-2 text-right font-mono">€{product.price.toFixed(2)}</div>
                <div className="hidden md:block col-span-2 text-center text-[10px]">
                    {product.is_price_per_kilo ? (
                        <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">Per Kilo</span>
                    ) : product.weight_per_unit > 0 ? (
                        <div className="flex flex-col items-center">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">Verpakt</span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">{product.weight_per_unit}kg/st</span>
                        </div>
                    ) : (
                        <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">Vast</span>
                    )}
                </div>
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

            <div className="flex items-center gap-4 px-3 pb-3 pt-0 md:hidden text-xs text-muted-foreground">
                <div className="font-bold text-foreground">€{product.price.toFixed(2)}</div>
                <div>{product.weight_per_unit} {product.unit_label}</div>
                <div>{product.category}</div>
                <div className="ml-auto">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 ring-inset ${product.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                        {product.is_active ? 'Actief' : 'Inactief'}
                    </span>
                </div>
            </div>
        </div>
    )
}
