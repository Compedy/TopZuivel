import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import { adminLogout } from '@/app/actions'
import { Button } from '@/components/ui/button' // Assuming we can use this or make a Client Component for logout
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default async function AdminPage() {
    const cookieStore = await cookies()
    const isAdmin = cookieStore.get('admin_session')?.value === 'true'

    // If not authenticated, show login form
    if (!isAdmin) {
        return <AdminLoginForm />
    }

    // Authenticated: Fetch data using Admin Client (Service Role)
    const supabase = createAdminClient()

    // 1. Fetch Products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true }) // Using new sort order

    // 2. Fetch Orders
    // We select company_name and email directly from orders for guests
    const { data: orders, error: ordersError } = await (supabase
        .from('orders')
        .select(`
            *,
            order_items (
                id,
                product_id,
                quantity,
                price_snapshot,
                products (name, unit_label)
            )
        `)
        .order('created_at', { ascending: false }) as any)

    if (ordersError) {
        console.error('Error fetching orders:', ordersError)
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-card px-4 shadow-sm">
                <h1 className="text-lg font-bold text-foreground md:text-xl">Top Zuivel Backoffice</h1>
                <div className="ml-auto flex items-center gap-4">

                    <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link href="/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Naar Winkel
                        </Link>
                    </Button>
                    <span className="text-sm text-muted-foreground hidden sm:inline-block">Admin Ingelogd</span>
                    <form action={adminLogout}>
                        <button type="submit" className="text-sm font-medium text-destructive hover:underline">
                            Uitloggen
                        </button>
                    </form>
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
