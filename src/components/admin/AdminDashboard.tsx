
'use client'

import { Product, OrderWithItems } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import AdminProductList from './AdminProductList'
import AdminOrderList from './AdminOrderList'
import AdminWeekOverview from './AdminWeekOverview'
import AdminInvoiceOverview from './AdminInvoiceOverview'
import AdminRecurringOverview from './AdminRecurringOverview'
import AdminStockCount from './AdminStockCount'

interface AdminDashboardProps {
    initialProducts: Product[]
    initialOrders: OrderWithItems[]
}

export default function AdminDashboard({ initialProducts, initialOrders }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState('orders')

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="md:hidden mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecteer pagina" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="orders">Bestellingen</SelectItem>
                        <SelectItem value="weeks">Week Overzicht</SelectItem>
                        <SelectItem value="billing">Facturatie</SelectItem>
                        <SelectItem value="recurring">Periodiek</SelectItem>
                        <SelectItem value="stock">Voorraad Tellen</SelectItem>
                        <SelectItem value="products">Product Beheer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <TabsList className="hidden md:grid w-full grid-cols-6 max-w-[1100px] mb-4">
                <TabsTrigger value="orders">Bestellingen</TabsTrigger>
                <TabsTrigger value="weeks">Week Overzicht</TabsTrigger>
                <TabsTrigger value="billing">Facturatie</TabsTrigger>
                <TabsTrigger value="recurring">Periodiek</TabsTrigger>
                <TabsTrigger value="stock">Voorraad Tellen</TabsTrigger>
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
            <TabsContent value="stock" className="mt-4">
                <AdminStockCount initialProducts={initialProducts} />
            </TabsContent>
            <TabsContent value="products" className="mt-4">
                <AdminProductList initialProducts={initialProducts} />
            </TabsContent>
        </Tabs>
    )
}
