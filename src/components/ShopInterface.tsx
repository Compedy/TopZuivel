
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import ProductRow from './ProductRow'
import CartModal from './CartModal'
import { Button } from './ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

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
    user: any
}

export type CartItem = {
    productId: string
    quantity: number
    product: Product
}

export default function ShopInterface({ products, user }: ShopInterfaceProps) {
    const [cart, setCart] = useState<Record<string, number>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [orderPlaced, setOrderPlaced] = useState(false)
    const router = useRouter()
    const supabase = createClient()

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

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
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
        setOrderPlaced(false)
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end md:hidden mb-4">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
                    <LogOut className="mr-2 h-4 w-4" /> Uitloggen
                </Button>
            </div>

            {categories.map(category => (
                <section key={category} className="space-y-4">
                    <h2 className="sticky top-14 z-20 bg-background/95 py-2 text-xl font-bold bg-muted/30 backdrop-blur-sm border-b border-border text-primary px-2 rounded-t-md">
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
                userId={user.id}
            />
        </div>
    )
}
