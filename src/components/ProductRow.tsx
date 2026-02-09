'use client'

import { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

interface ProductRowProps {
    product: Product
    quantity: number
    onQuantityChange: (productId: string, val: number) => void
}

export default function ProductRow({ product, quantity, onQuantityChange }: ProductRowProps) {

    const [displayQuantity, setDisplayQuantity] = useState(quantity.toString())

    // Sync display quantity when the actual quantity prop changes (e.g. from buttons or other source)
    useEffect(() => {
        if (parseFloat(displayQuantity) !== quantity) {
            setDisplayQuantity(quantity.toString())
        }
    }, [quantity])

    const handleIncrement = () => onQuantityChange(product.id, quantity + 1)
    const handleDecrement = () => onQuantityChange(product.id, Math.max(0, quantity - 1))

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDisplayQuantity(value)

        const rawVal = value.replace(',', '.')
        const val = parseFloat(rawVal)
        if (!isNaN(val) && val >= 0) {
            onQuantityChange(product.id, val)
        } else if (value === '') {
            onQuantityChange(product.id, 0)
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
    }

    return (
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm hover:border-primary/50 transition-colors">
            <div className="grid grid-cols-12 gap-4 items-center">
                {/* Mobile: Name takes full width typically, but here we enforce grid */}
                <div className="col-span-8 md:col-span-5">
                    <div className="font-medium text-foreground">{product.name}</div>
                    {product.is_price_per_kilo && (
                        <div className="text-xs text-muted-foreground md:hidden">
                            €{product.price.toFixed(2)} p/kg
                        </div>
                    )}
                </div>

                {/* Price & Unit - Hidden on small mobile if tight, but we try to show */}
                <div className="col-span-4 md:col-span-2 text-right text-sm">
                    <span className="font-semibold block md:inline">
                        {formatPrice(product.price)}
                    </span>
                    <span className="text-muted-foreground text-xs md:hidden"> / {product.unit_label}</span>
                </div>

                <div className="hidden md:block col-span-2 text-right text-sm text-muted-foreground">
                    Per {product.unit_label}
                </div>

                {/* Controls */}
                <div className="col-span-12 md:col-span-3 flex items-center justify-end gap-2 mt-2 md:mt-0">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleDecrement}
                        disabled={quantity === 0}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        type="text"
                        inputMode="decimal"
                        value={displayQuantity}
                        onChange={handleInputChange}
                        className="h-8 w-16 text-center"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleIncrement}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Estimated Weight/Price hint for Per Kilo items */}
            {quantity > 0 && product.is_price_per_kilo && (
                <div className="mt-2 text-xs text-right text-muted-foreground border-t border-border/50 pt-2">
                    Schatting: {product.weight_per_unit}kg x {quantity}st ≈ {quantity * product.weight_per_unit}kg
                    <br />
                    Indicatie: {formatPrice(product.price * product.weight_per_unit * quantity)}
                </div>
            )}

            {/* Total hint for normal items */}
            {quantity > 0 && !product.is_price_per_kilo && (
                <div className="mt-2 text-xs text-right text-muted-foreground md:hidden border-t border-border/50 pt-2">
                    Totaal: {formatPrice(product.price * quantity)}
                </div>
            )}
        </div>
    )
}
