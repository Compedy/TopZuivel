
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import ProductRow from './ProductRow'
import CartModal from './CartModal'
import { Button } from './ui/button'

// Simple helper to group by property since we might not have lodash installed yet
function groupProductsByCategory(products: Product[]) {
    return products.reduce((groups, product) => {
        const category = product.category
        if (!groups[category]) {
            groups[category] = []
        }
        groups[category].push(product)
        return groups
    }, {} as Record<string, Product[]>)
}

interface ShopInterfaceProps {
    products: Product[]
    // user: any // Removed
}

export type CartItem = {
    productId: string
    quantity: number
    product: Product
}

export default function ShopInterface({ products }: ShopInterfaceProps) {
    const [cart, setCart] = useState<Record<string, number>>({})

    const groupedProducts = useMemo(() => groupProductsByCategory(products), [products])
    const categories = Object.keys(groupedProducts).sort() // Or custom logic if needed

    const handleQuantityChange = (productId: string, quantity: number) => {
        setCart(prev => {
            const newCart = { ...prev }
            if (quantity <= 0) {
                delete newCart[productId]
            } else {
                newCart[productId] = quantity
            }
            return newCart
        })
    }

    // Calculate cart items for the modal
    const cartItems: CartItem[] = useMemo(() => {
        return Object.entries(cart).map(([productId, quantity]) => {
            const product = products.find(p => p.id === productId)!
            return {
                productId,
                quantity,
                product
            }
        })
    }, [cart, products])

    const resetCart = () => {
        setCart({})
    }

    const scrollToCategory = (category: string) => {
        const element = document.getElementById(category)
        if (element) {
            const headerOffset = 180 // Approximate height of sticky headers + nav
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            })
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end md:hidden mb-4">
                {/* Logout button removed */}
            </div>

            {/* Category Navigation */}
            <div className="sticky top-16 z-40 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
                {categories.map(category => (
                    <Button
                        key={category}
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToCategory(category)}
                        className="rounded-full text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                        {category}
                    </Button>
                ))}
            </div>

            {categories.map(category => (
                <section key={category} id={category} className="space-y-4 scroll-mt-32">
                    <h2 className="sticky top-28 z-20 bg-background/95 py-2 text-xl font-bold bg-muted/30 backdrop-blur-sm border-b border-border text-primary px-2 rounded-t-md">
                        {category}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-1">
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                            <div className="col-span-6 md:col-span-5">Product</div>
                            <div className="col-span-3 md:col-span-2 text-right">Prijs</div>
                            <div className="col-span-3 md:col-span-2 text-right">Eenheid</div>
                            <div className="col-span-12 md:col-span-3 text-right">Aantal</div>
                        </div>
                        {groupedProducts[category].map(product => (
                            <ProductRow
                                key={product.id}
                                product={product}
                                quantity={cart[product.id] || 0}
                                onQuantityChange={handleQuantityChange}
                            />
                        ))}
                    </div>
                </section>
            ))}

            <CartModal
                cartItems={cartItems}
                onSubmitSuccess={resetCart}
            />
        </div>
    )
}
