
'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/types'
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
}

export type CartItem = {
    productId: string
    quantity: number
    product: Product
}

export default function ShopInterface({ products }: ShopInterfaceProps) {
    const [cart, setCart] = useState<Record<string, number>>({})

    const groupedProducts = useMemo(() => groupProductsByCategory(products), [products])
    const categories = useMemo(() => Object.keys(groupedProducts).sort(), [groupedProducts])

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
                />
            ))}

            <CartModal
                cartItems={cartItems}
                onSubmitSuccess={resetCart}
            />
        </div>
    )
}
