
'use client'

import { Product } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdminProductList from './AdminProductList'
import AdminOrderList from './AdminOrderList'
import AdminWeekOverview from './AdminWeekOverview'
import AdminInvoiceOverview from './AdminInvoiceOverview'
import AdminRecurringOverview from './AdminRecurringOverview'

interface AdminDashboardProps {
    initialProducts: Product[]
    initialOrders: any[]
}

export default function AdminDashboard({ initialProducts, initialOrders }: AdminDashboardProps) {
    // We can add realtime subscriptions here if needed
    return (
        <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-5 max-w-[1000px]">
                <TabsTrigger value="orders">Bestellingen</TabsTrigger>
                <TabsTrigger value="weeks">Week Overzicht</TabsTrigger>
                <TabsTrigger value="billing">Facturatie</TabsTrigger>
                <TabsTrigger value="recurring">Periodiek</TabsTrigger>
                <TabsTrigger value="products">Product Beheer</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-4">
                <AdminOrderList initialOrders={initialOrders} />
            </TabsContent>
            <TabsContent value="weeks" className="mt-4">
                <AdminWeekOverview orders={initialOrders} products={initialProducts} />
            </TabsContent>
            <TabsContent value="billing" className="mt-4">
                <AdminInvoiceOverview orders={initialOrders} products={initialProducts} />
            </TabsContent>
            <TabsContent value="recurring" className="mt-4">
                <AdminRecurringOverview products={initialProducts} />
            </TabsContent>
            <TabsContent value="products" className="mt-4">
                <AdminProductList initialProducts={initialProducts} />
            </TabsContent>
        </Tabs>
    )
}
