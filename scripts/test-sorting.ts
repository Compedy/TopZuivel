
import { sortProducts } from '../src/lib/product-sorting'

const mockProducts = [
    { name: 'Oude Kaas', category: 'Kaas' },
    { name: 'Jong Belegen Kaas', category: 'Kaas' },
    { name: 'Melk', category: 'Zuivel' },
    { name: 'Overjarig', category: 'Kaas' },
    { name: 'Extra Belegen', category: 'Kaas' },
    { name: 'Jonge Kaas', category: 'Kaas' },
    { name: 'Belegen Kaas', category: 'Kaas' },
    { name: 'Boter', category: 'Zuivel' },
    { name: 'Gevacumeerde Belegen', category: 'Kaas' },
]

console.log('--- Original ---')
mockProducts.forEach(p => console.log(`${p.category}: ${p.name}`))

const sorted = sortProducts(mockProducts)

console.log('\n--- Sorted ---')
sorted.forEach(p => console.log(`${p.category}: ${p.name}`))

// Verifying order
const expectedOrder = [
    'Jonge Kaas',
    'Jong Belegen Kaas',
    'Belegen Kaas',
    'Gevacumeerde Belegen', // Belegen includes 'belegen'
    'Extra Belegen',
    'Oude Kaas',
    'Overjarig',
    'Boter',
    'Melk'
]

console.log('\nVerification result:')
const actualOrder = sorted.map(p => p.name)
let allMatch = true
sorted.forEach((p, i) => {
    if (p.name.includes(expectedOrder[i])) {
        // ok
    } else {
        console.log(`Mismatch at index ${i}: Expected ${expectedOrder[i]}, got ${p.name}`)
        allMatch = false
    }
})

if (allMatch) console.log('✅ Sorting logic matches expectation')
else console.log('❌ Sorting logic mismatch')
