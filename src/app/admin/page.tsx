
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/')
    }

    // 2. Role Check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive">Geen Toegang</h1>
                    <p className="mt-2 text-muted-foreground">U heeft geen rechten om deze pagina te bekijken.</p>
                </div>
            </div>
        )
    }

    // 3. Fetch Data
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

    const { data: orders } = await supabase
        .from('orders')
        .select(`
      *,
      profiles (business_name, email),
      order_items (
         quantity,
         price_snapshot,
         products (name, unit_label)
      )
    `)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-card px-4 shadow-sm">
                <h1 className="text-lg font-bold text-foreground md:text-xl">Top Zuivel Backoffice</h1>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Admin: {user.email}</span>
                </div>
            </header>
            <main className="container mx-auto p-4 max-w-6xl">
                <AdminDashboard
                    initialProducts={products || []}
                    initialOrders={orders || []}
                />
            </main>
        </div>
    )
}
