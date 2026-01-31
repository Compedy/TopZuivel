
import Link from 'next/link'
import { Mail, Phone, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-primary px-4 shadow-sm gap-3">
                <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                    <div className="bg-white p-1 rounded-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Top Zuivel" className="h-10 w-auto object-contain" />
                    </div>
                    <h1 className="text-lg font-bold text-primary-foreground md:text-xl">Top Zuivel Bestellen</h1>
                </Link>
                <div className="ml-auto flex items-center gap-4">
                    <Button asChild variant="secondary" size="sm">
                        <Link href="/" className="gap-2">
                            <ChevronLeft className="h-4 w-4" /> Terug naar Shop
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto p-4 max-w-2xl mt-8">
                <Card className="shadow-lg border-2">
                    <CardHeader className="bg-muted/30 border-b text-center">
                        <CardTitle className="text-2xl font-bold">Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        <div className="space-y-4">
                            <p className="text-lg font-medium text-center">
                                Heeft u vragen, wilt u iets bestellen? U mag mailen naar:
                            </p>
                            <div className="flex justify-center">
                                <a
                                    href="mailto:topzuivel@gmail.com"
                                    className="flex items-center gap-3 text-xl font-bold text-primary hover:underline bg-primary/5 p-4 rounded-lg w-full justify-center border border-primary/20"
                                >
                                    <Mail className="h-6 w-6" /> topzuivel@gmail.com
                                </a>
                            </div>
                            <p className="text-sm text-muted-foreground text-center italic">
                                En dan hopen we de vraag z.s.m te beantwoorden.
                            </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <p className="text-lg font-medium text-center">Bellen mag ook altijd:</p>
                            <div className="grid gap-3 max-w-sm mx-auto">
                                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">Winkel</span>
                                    </div>
                                    <a href="tel:0620298557" className="font-mono font-bold hover:text-primary transition-colors">0620298557</a>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">Gerrit</span>
                                    </div>
                                    <a href="tel:0646064046" className="font-mono font-bold hover:text-primary transition-colors">0646064046</a>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">Christiana</span>
                                    </div>
                                    <a href="tel:0615489585" className="font-mono font-bold hover:text-primary transition-colors">0615489585</a>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
