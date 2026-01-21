
import { createClient } from '@/lib/supabase/server'
import ShopInterface from '@/components/ShopInterface'

export default async function Home() {
  const supabase = await createClient()

  // No auth check needed for public access

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching products:', error)
    return <div>Er is een fout opgetreden bij het laden van de producten.</div>
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-primary px-4 shadow-sm">
        <h1 className="text-lg font-bold text-primary-foreground md:text-xl">Top Zuivel Bestellen</h1>
        <div className="ml-auto flex items-center gap-4">
          {/* Public access, no user info or logout needed */}
        </div>
      </header>
      <main className="container mx-auto p-4 max-w-4xl">
        <ShopInterface products={products || []} />
      </main>
    </div>
  )
}
