'use client'

import { Product } from '@/types'
import ProductRow from './ProductRow'

interface ProductGridProps {
    category: string
    products: Product[]
    cart: Record<string, number>
    onQuantityChange: (productId: string, quantity: number) => void
}

export default function ProductGrid({ category, products, cart, onQuantityChange }: ProductGridProps) {
    return (
        <section id={category} className="space-y-4 scroll-mt-[170px]">
            <h2 className="sticky top-32 z-20 bg-background/95 py-2 text-xl font-bold bg-muted/30 backdrop-blur-sm border-b border-border text-primary px-2 rounded-t-md">
                {category}
            </h2>
            <div className="grid gap-4 sm:grid-cols-1">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <div className="col-span-6 md:col-span-5">Product</div>
                    <div className="col-span-3 md:col-span-2 text-right">Prijs</div>
                    <div className="col-span-3 md:col-span-2 text-right">Eenheid</div>
                    <div className="col-span-12 md:col-span-3 text-right">Aantal</div>
                </div>
                {products.map(product => (
                    <ProductRow
                        key={product.id}
                        product={product}
                        quantity={cart[product.id] || 0}
                        onQuantityChange={onQuantityChange}
                    />
                ))}
            </div>
        </section>
    )
}
