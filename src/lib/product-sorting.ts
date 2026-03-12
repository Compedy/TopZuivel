import { Product } from '@/types'

const CHEESE_ORDER = [
    'jong',
    'belegen',
    'extra belegen',
    'oude',
    'overjarig'
]

export function sortProducts<T extends { name: string; category: string }>(products: T[]): T[] {
    return [...products].sort((a, b) => {
        // 1. Category comparison (Kaas first)
        if (a.category === 'Kaas' && b.category !== 'Kaas') return -1
        if (a.category !== 'Kaas' && b.category === 'Kaas') return 1

        // 2. If both are Kaas, check for age keywords
        if (a.category === 'Kaas' && b.category === 'Kaas') {
            const aName = a.name.toLowerCase()
            const bName = b.name.toLowerCase()

            const aIndex = CHEESE_ORDER.findIndex(age => aName.includes(age))
            const bIndex = CHEESE_ORDER.findIndex(age => bName.includes(age))

            // If both have an age keyword, sort by CHEESE_ORDER
            if (aIndex !== -1 && bIndex !== -1) {
                if (aIndex !== bIndex) return aIndex - bIndex
            }
            // If only one has an age keyword, it comes first
            else if (aIndex !== -1) {
                return -1
            } else if (bIndex !== -1) {
                return 1
            }
        }

        // 3. Fallback to alphabetical name
        return a.name.localeCompare(b.name, 'nl')
    })
}
