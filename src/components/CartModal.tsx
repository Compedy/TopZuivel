
'use client'

import { useState } from 'react'
import { CartItem } from './ShopInterface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { ShoppingCart } from 'lucide-react'
import { submitOrder } from '@/app/actions'
import { toast } from 'sonner'

interface CartModalProps {
    cartItems: CartItem[]
    onSubmitSuccess: () => void
    disabled?: boolean
}

export default function CartModal({ cartItems, onSubmitSuccess, disabled = false }: CartModalProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [companyName, setCompanyName] = useState('')
    const [email, setEmail] = useState('')
    const [notes, setNotes] = useState('')

    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0)

    const estimatedTotal = cartItems.reduce((acc, item) => {
        if (item.product.is_price_per_kilo) {
            return acc + (item.product.price * item.product.weight_per_unit * item.quantity)
        }
        return acc + (item.product.price * item.quantity)
    }, 0)

    const handleSubmit = async () => {
        if (!companyName || !email) {
            toast.warning('Vul alstublieft uw bedrijfsnaam en e-mailadres in.')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await submitOrder({
                companyName,
                email,
                cartItems,
                notes: notes.trim() || undefined
            })
            if (result.success) {
                setSuccess(true)
                onSubmitSuccess()
                setCompanyName('')
                setEmail('')
                setNotes('')
                // Keep modal open for a moment to show success message
            } else {
                toast.error('Er ging iets mis: ' + result.error)
            }
        } catch (e) {
            console.error(e)
            toast.error('Er is een onverwachte fout opgetreden.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        if (success) {
            setSuccess(false) // Reset for next time
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price)
    }

    return (
        <>
            {/* Floating Action Button */}
            {totalItems > 0 && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Button
                        className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center relative cursor-pointer"
                        onClick={() => setOpen(true)}
                    >
                        <ShoppingCart className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold border border-background">
                            {totalItems}
                        </span>
                    </Button>
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto sm:top-[50%] sm:translate-y-[-50%] top-[1rem] translate-y-0">
                    <DialogHeader>
                        <DialogTitle>Bestelling Bevestigen</DialogTitle>
                        <DialogDescription>
                            Controleer uw bestelling en vul uw gegevens in.
                        </DialogDescription>
                    </DialogHeader>

                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-lg font-medium">Bestelling Geplaatst!</h3>
                            <p className="text-muted-foreground">U ontvangt binnen enkele minuten een bevestiging per e-mail.</p>
                            <Button onClick={handleClose} className="w-full">Sluiten</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="border rounded-md divide-y overflow-hidden max-h-60 overflow-y-auto">
                                {cartItems.map(item => (
                                    <div key={item.productId} className="flex justify-between p-3 text-sm bg-card hover:bg-accent/50">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.product.name}</span>
                                            <span className="text-muted-foreground text-xs">Aantal: {item.quantity} x {item.product.unit_label}</span>
                                        </div>
                                        <div className="text-right">
                                            {item.product.is_price_per_kilo ? (
                                                <span className="text-muted-foreground italic">~{formatPrice(item.product.price * item.product.weight_per_unit * item.quantity)}</span>
                                            ) : (
                                                <span>{formatPrice(item.product.price * item.quantity)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t font-bold">
                                <span>Geschat Totaal:</span>
                                <span>{formatPrice(estimatedTotal)}</span>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium text-sm text-foreground">Uw Gegevens</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Bedrijfsnaam</Label>
                                    <Input
                                        id="companyName"
                                        value={companyName}
                                        onChange={(e) => e?.target && setCompanyName(e.target.value)}
                                        placeholder="Bijv. Café De Markt"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mailadres</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => e?.target && setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Opmerking / Speciaal verzoek (Optioneel)</Label>
                                    <Textarea
                                        id="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Bijv. Levering op woensdag voor 10:00 uur..."
                                        className="resize-none"
                                    />
                                </div>
                            </div>


                            <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 border border-yellow-200 mt-4">
                                Let op: Bij gewichtsartikelen is de prijs een schatting. De factuur wordt gebaseerd op het werkelijke gewicht.
                            </div>

                            <DialogFooter className="sm:justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Annuleren</Button>
                                <Button onClick={() => handleSubmit()} disabled={isSubmitting || cartItems.length === 0 || !companyName || !email || disabled} className="bg-primary text-primary-foreground">
                                    {isSubmitting ? 'Versturen...' : disabled ? 'Gesloten' : 'Bestelling Plaatsen'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
