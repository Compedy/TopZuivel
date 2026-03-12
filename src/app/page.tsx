import { createClient } from '@/lib/supabase/server'
import ShopInterface from '@/components/ShopInterface'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'
import type { Metadata } from 'next'
import { sortProducts } from '@/lib/product-sorting'

export const metadata: Metadata = {
  metadataBase: new URL('https://topzuivel.vercel.app'), // Replace with actual production URL if known
  title: 'Top Zuivel - Vers van de Boer | B2B Bestelportaal',
  description: 'Exclusief bestelportaal voor zakelijke klanten van Top Zuivel. Bestel uw verse kaas en zuivel direct online.',
  openGraph: {
    title: 'Top Zuivel Bestelportaal',
    description: 'Vers van de boer, direct geleverd.',
    images: ['/logo.png'],
  }
}

export default async function Home() {
  const supabase = await createClient()

  // No auth check needed for public access

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching products:', error)
    return <div>Er is een fout opgetreden bij het laden van de producten.</div>
  }

  const sortedProducts = sortProducts(products || [])

  const { data: settingsData } = await supabase
    .from('store_settings')
    .select('value')
    .eq('key', 'availability')
    .single()

  const openDays: number[] = settingsData?.value?.open_days || [1, 2, 3, 4, 5]

  return (
    <div className="min-h-screen bg-background pb-20 font-sans tracking-tight">
      <header className="sticky top-0 z-50 flex h-20 items-center border-b border-border/40 bg-primary/95 backdrop-blur-md px-6 shadow-lg gap-4">
        <div className="bg-white p-1.5 rounded-lg shadow-sm transform hover:scale-105 transition-transform duration-200">
          <Image
            src="/logo.png"
            alt="Top Zuivel Logo"
            width={48}
            height={48}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold text-primary-foreground leading-none">Top Zuivel</h1>
          <p className="text-xs text-primary-foreground/80 font-medium tracking-wide">B2B BESTELPORTAAL</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button asChild variant="secondary" size="sm" className="gap-2 rounded-full px-4 font-semibold shadow-sm hover:shadow-md transition-all">
            <Link href="/contact">
              <Info className="h-4 w-4" />
              <span>Contact</span>
            </Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-6 max-w-5xl">
        <ShopInterface products={sortedProducts} openDays={openDays} />
      </main>
    </div>
  )
}
