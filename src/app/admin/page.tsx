import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import { adminLogout } from '@/app/actions'
import { Button } from '@/components/ui/button'
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
        .eq('is_deleted', false)
        .order('sort_order', { ascending: true }) // Using new sort order

    // 2. Fetch Orders
    // We select company_name and email directly from orders for guests
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                id,
                order_id,
                product_id,
                quantity,
                price_snapshot,
                actual_weight,
                is_completed,
                products (name, unit_label, category, is_price_per_kilo, weight_per_unit, stock_quantity, stock_quantity, sort_order, is_deleted)
            )
        `)
        .order('created_at', { ascending: false })

    if (ordersError) {
        console.error('Error fetching orders:', ordersError)
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center border-b border-border bg-card px-3 md:px-4 shadow-sm gap-2">
                <div className="bg-white p-1 rounded-sm border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Top Zuivel" className="h-8 md:h-10 w-auto object-contain" />
                </div>
                <h1 className="text-sm md:text-xl font-bold text-foreground flex-shrink-1 truncate mr-2">
                    <span className="hidden sm:inline">Top Zuivel </span>Backoffice
                </h1>
                <div className="ml-auto flex items-center gap-2 md:gap-4">
                    <Button asChild variant="outline" size="sm" className="h-8 px-2 md:px-4 gap-1 md:gap-2">
                        <Link href="/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="text-xs md:text-sm">Winkel</span>
                        </Link>
                    </Button>
                    <span className="text-xs text-muted-foreground hidden lg:inline-block">Admin</span>
                    <form action={adminLogout}>
                        <button type="submit" className="text-xs md:text-sm font-medium text-destructive hover:underline">
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
