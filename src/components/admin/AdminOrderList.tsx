
'use client'


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AdminOrderListProps {
    initialOrders: any[]
}

export default function AdminOrderList({ initialOrders }: AdminOrderListProps) {

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('nl-NL', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
    }

    return (
        <div className="space-y-4">
            {initialOrders.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">Geen bestellingen gevonden.</CardContent>
                </Card>
            ) : (
                initialOrders.map(order => (
                    <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 py-3 flex flex-row items-center justify-between border-b">
                            <div className="flex flex-col">
                                <span className="font-bold">{order.profiles?.business_name || 'Onbekende Klant'}</span>
                                <span className="text-xs text-muted-foreground">{order.profiles?.email}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant={order.status === 'pending' ? 'default' : 'secondary'}>
                                    {order.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/20 text-muted-foreground">
                                    <tr>
                                        <th className="py-2 px-4 text-left font-medium">Product</th>
                                        <th className="py-2 px-4 text-right font-medium">Aantal</th>
                                        <th className="py-2 px-4 text-right font-medium">Prijs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {order.order_items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-2 px-4">{item.products?.name}</td>
                                            <td className="py-2 px-4 text-right">
                                                {item.quantity} {item.products?.unit_label}
                                            </td>
                                            <td className="py-2 px-4 text-right text-muted-foreground">
                                                {formatPrice(item.price_snapshot)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    )
}
