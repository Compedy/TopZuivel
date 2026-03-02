
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
import { AlertCircle } from 'lucide-react'
import CartModal from './CartModal'
import CategoryNav from './CategoryNav'
import ProductGrid from './ProductGrid'

// Simple helper to group by property
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
    openDays: number[]
}

export type CartItem = {
    productId: string
    quantity: number
    product: Product
}

export default function ShopInterface({ products, openDays }: ShopInterfaceProps) {
    const [cart, setCart] = useState<Record<string, number>>({})

    const groupedProducts = useMemo(() => groupProductsByCategory(products), [products])
    const categories = useMemo(() => Object.keys(groupedProducts).sort(), [groupedProducts])

    // 0 is Sunday, 1 is Monday, etc.
    const currentDay = new Date().getDay()
    const isOpen = openDays.includes(currentDay)

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
            const headerOffset = 180
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
            {!isOpen && (
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-8 rounded-md flex items-center justify-center gap-6 shadow-md mb-10 max-w-4xl mx-auto text-center">
                    <AlertCircle className="h-10 w-10 text-amber-600 shrink-0" />
                    <div>
                        <h3 className="font-bold text-amber-800 text-2xl">De webshop is momenteel gesloten</h3>
                        <p className="text-lg mt-2 text-amber-900/90 font-medium">
                            U kunt vandaag onze producten bekijken, maar helaas geen bestellingen plaatsen.
                        </p>
                    </div>
                </div>
            )}

            <CategoryNav
                categories={categories}
                onCategoryClick={scrollToCategory}
            />

            {categories.map(category => (
                <ProductGrid
                    key={category}
                    category={category}
                    products={groupedProducts[category]}
                    cart={cart}
                    onQuantityChange={handleQuantityChange}
                    isOpen={isOpen}
                />
            ))}

            {isOpen && (
                <CartModal
                    cartItems={cartItems}
                    onSubmitSuccess={resetCart}
                    disabled={!isOpen}
                />
            )}
        </div>
    )
}
