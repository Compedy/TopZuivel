'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save, Loader2, Info } from 'lucide-react'
import { getStoreSettings, updateStoreSettings } from '@/app/admin/actions'

const WEEKDAYS = [
    { id: 1, label: 'Maandag' },
    { id: 2, label: 'Dinsdag' },
    { id: 3, label: 'Woensdag' },
    { id: 4, label: 'Donderdag' },
    { id: 5, label: 'Vrijdag' },
    { id: 6, label: 'Zaterdag' },
    { id: 0, label: 'Zondag' },
]

export default function AdminSettings() {
    const [openDays, setOpenDays] = useState<number[]>([1, 2, 3, 4, 5])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setLoading(true)
        const result = await getStoreSettings('availability')
        if (result.success && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
            const data = result.data as Record<string, unknown>
            setOpenDays((data.open_days as number[]) || [1, 2, 3, 4, 5])
        }
        setLoading(false)
    }

    const handleDayToggle = (dayId: number) => {
        setOpenDays(prev =>
            prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId].sort()
        )
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        const result = await updateStoreSettings('availability', { open_days: openDays })

        if (result.success) {
            setMessage({ type: 'success', text: 'Instellingen succesvol opgeslagen.' })
        } else {
            setMessage({ type: 'error', text: result.error || 'Fout bij opslaan van instellingen.' })
        }
        setSaving(false)

        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
    }

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Winkel Instellingen</CardTitle>
                    <CardDescription>
                        Beheer de algemene instellingen van de website en bestelmodule.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md border border-border">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Besteledagen (Shop Open)</p>
                                <p className="text-sm text-muted-foreground">
                                    Selecteer op welke dagen klanten bestellingen mogen plaatsen. Op andere dagen is de "Bestellen" knop uitgeschakeld en wordt er een melding getoond.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {WEEKDAYS.map((day) => (
                                <div key={day.id} className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                    <Checkbox
                                        id={`day-${day.id}`}
                                        checked={openDays.includes(day.id)}
                                        onCheckedChange={() => handleDayToggle(day.id)}
                                    />
                                    <div className="space-y-1 leading-none">
                                        <Label htmlFor={`day-${day.id}`} className="font-medium cursor-pointer">
                                            {day.label}
                                        </Label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
                                {saving ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig...</>
                                ) : (
                                    <><Save className="mr-2 h-4 w-4" /> Opslaan</>
                                )}
                            </Button>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-md text-sm font-medium text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
