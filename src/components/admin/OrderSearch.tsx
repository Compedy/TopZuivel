'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

interface OrderSearchProps {
    searchQuery: string
    setSearchQuery: (query: string) => void
    showCompleted: boolean
    setShowCompleted: (show: boolean) => void
}

export default function OrderSearch({
    searchQuery,
    setSearchQuery,
    showCompleted,
    setShowCompleted
}: OrderSearchProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">Bestellingen Beheer</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Zoek op #, klant of email..."
                        className="pl-8 h-9 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-2 whitespace-nowrap">
                    <Label htmlFor="show-completed" className="text-sm text-muted-foreground">Toon voltooid</Label>
                    <Switch
                        id="show-completed"
                        checked={showCompleted}
                        onCheckedChange={setShowCompleted}
                    />
                </div>
            </div>
        </div>
    )
}
