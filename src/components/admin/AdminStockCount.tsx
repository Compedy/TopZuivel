'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Search, Save, Loader2, PackageOpen, LayoutGrid, CheckCircle } from 'lucide-react'
import { updateStockLevels } from '@/app/admin/actions'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle } from 'lucide-react'

interface AdminStockCountProps {
    initialProducts: Product[]
}

export default function AdminStockCount({ initialProducts }: AdminStockCountProps) {
    const [products, setProducts] = useState(initialProducts)
    const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set())
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [countMode, setCountMode] = useState<'edit' | 'fresh'>('edit')

    const categories = useMemo(() => {
        const cats = Array.from(new Set(initialProducts.map((p: Product) => p.category)))
        return cats.sort()
    }, [initialProducts])

    const filteredProducts = useMemo(() => {
        return products.filter((p: Product) => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
            const matchesCategory = !activeCategory || p.category === activeCategory
            return matchesSearch && matchesCategory
        }).sort((a: Product, b: Product) => (a.sort_order || 0) - (b.sort_order || 0))
    }, [products, search, activeCategory])

    const updateStock = (id: string, delta: number) => {
        setProducts((prev: Product[]) => prev.map((p: Product) => {
            if (p.id === id) {
                const newStock = Math.max(0, (p.stock_quantity || 0) + delta)
                if (newStock !== initialProducts.find(ip => ip.id === id)?.stock_quantity) {
                    setModifiedIds(new Set(modifiedIds).add(id))
                } else {
                    const newModified = new Set(modifiedIds)
                    newModified.delete(id)
                    setModifiedIds(newModified)
                }
                return { ...p, stock_quantity: newStock }
            }
            return p
        }))
    }

    const switchMode = (newMode: 'edit' | 'fresh') => {
        if (newMode === countMode) return

        if (modifiedIds.size > 0) {
            if (!confirm('Je hebt onopgeslagen wijzigingen. Weet je zeker dat je van modus wilt wisselen? Je wijzigingen gaan verloren.')) {
                return
            }
        }

        setCountMode(newMode)
        if (newMode === 'fresh') {
            setProducts(products.map(p => ({ ...p, stock_quantity: 0 })))
            setModifiedIds(new Set(products.map(p => p.id)))
        } else {
            setProducts(initialProducts)
            setModifiedIds(new Set())
        }
    }

    const handleInputChange = (id: string, val: string) => {
        const rawVal = val.replace(',', '.')
        const num = parseFloat(rawVal) || 0
        setProducts((prev: Product[]) => prev.map((p: any) => {
            if (p.id === id) {
                if (num !== initialProducts.find(ip => ip.id === id)?.stock_quantity) {
                    setModifiedIds(new Set(modifiedIds).add(id))
                } else {
                    const newModified = new Set(modifiedIds)
                    newModified.delete(id)
                    setModifiedIds(newModified)
                }
                return { ...p, stock_quantity: num, display_stock: val }
            }
            return p
        }))
    }

    const handleSave = async () => {
        if (modifiedIds.size === 0) return

        setSaving(true)
        const updates = (Array.from(modifiedIds) as string[]).map((id: string) => {
            const prod = products.find((p: Product) => p.id === id)
            return { id, stock_quantity: prod?.stock_quantity || 0 }
        })

        const result = await updateStockLevels(updates)
        if (result.success) {
            setModifiedIds(new Set())
            // No need to alert, just clear state. InitialProducts will be updated by revalidate
        } else {
            alert('Fout bij opslaan: ' + result.error)
        }
        setSaving(null as any)
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Controls */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm p-4 border rounded-xl shadow-md space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Product zoeken..."
                            className="pl-10 h-12 bg-muted/50 text-lg"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 flex justify-center">
                        <Tabs value={countMode} onValueChange={(val) => switchMode(val as 'edit' | 'fresh')}>
                            <TabsList className="h-12 p-1 bg-muted/80">
                                <TabsTrigger value="edit" className="px-6 text-base font-semibold">
                                    Huidige aanpassen
                                </TabsTrigger>
                                <TabsTrigger value="fresh" className="px-6 text-base font-semibold">
                                    Nieuwe telling
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button
                            className="h-12 flex-1 md:flex-none px-8 text-lg font-bold gap-2"
                            disabled={modifiedIds.size === 0 || saving}
                            onClick={handleSave}
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Opslaan ({modifiedIds.size})
                        </Button>
                    </div>
                </div>

                {/* Categories - Swipeable/Scrollable on Tablet */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <Button
                        variant={activeCategory === null ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full h-10 px-5 text-sm whitespace-nowrap"
                        onClick={() => setActiveCategory(null)}
                    >
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Alle
                    </Button>
                    {categories.map((cat: string) => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full h-10 px-5 text-sm whitespace-nowrap"
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Product List - Tablet Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product: Product) => {
                    const isModified = modifiedIds.has(product.id)
                    return (
                        <Card
                            key={product.id}
                            className={cn(
                                "transition-all duration-200 cursor-pointer select-none",
                                isModified ? "ring-2 ring-primary border-primary shadow-lg bg-primary/5" : "hover:shadow-md"
                            )}
                            onClick={() => updateStock(product.id, 1)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-lg leading-tight">{product.name}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</span>
                                    </div>
                                    {isModified && <Badge className="bg-orange-500 hover:bg-orange-500">Aangepast</Badge>}
                                </div>

                                <div className="flex items-center justify-between gap-4 mt-auto">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-16 w-16 rounded-2xl border-2 hover:bg-destructive hover:text-white transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            updateStock(product.id, -1)
                                        }}
                                    >
                                        <Minus className="h-8 w-8" />
                                    </Button>

                                    <div className="flex flex-col items-center flex-1">
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={(product as any).display_stock ?? product.stock_quantity ?? 0}
                                            onChange={(e) => handleInputChange(product.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-16 text-center text-3xl font-black border-none bg-transparent focus-visible:ring-0"
                                        />
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{product.unit_label}</span>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-16 w-16 rounded-2xl border-2 hover:bg-green-600 hover:text-white transition-colors"
                                        onClick={(e) => {
                                            // Propagation will bubble to Card and trigger +1, 
                                            // but to be explicit and avoid double triggering in case of future changes:
                                            e.stopPropagation()
                                            updateStock(product.id, 1)
                                        }}
                                    >
                                        <Plus className="h-8 w-8" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">Geen producten gevonden</h3>
                    <p className="text-sm text-muted-foreground">Probeer een andere zoekterm of categorie.</p>
                </div>
            )}

            {/* Floating Action Button for Tablet (Save) */}
            {modifiedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <Button
                        size="lg"
                        className="rounded-full px-10 h-16 text-xl font-black shadow-2xl gap-3"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle className="h-6 w-6" />}
                        NU OPSLAAN
                    </Button>
                </div>
            )}
        </div>
    )
}
