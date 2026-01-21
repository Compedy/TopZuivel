
'use client'

import { Product } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdminProductList from './AdminProductList'
import AdminOrderList from './AdminOrderList'

interface AdminDashboardProps {
    initialProducts: Product[]
    initialOrders: any[]
}

export default function AdminDashboard({ initialProducts, initialOrders }: AdminDashboardProps) {
    // We can add realtime subscriptions here if needed
    return (
        <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="orders">Bestellingen</TabsTrigger>
                <TabsTrigger value="products">Product Beheer</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-4">
                <AdminOrderList initialOrders={initialOrders} />
            </TabsContent>
            <TabsContent value="products" className="mt-4">
                <AdminProductList initialProducts={initialProducts} />
            </TabsContent>
        </Tabs>
    )
}
