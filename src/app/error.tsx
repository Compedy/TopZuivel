'use client'

import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
                <h2 className="text-2xl font-bold text-foreground">Er ging iets mis</h2>
                <p className="text-muted-foreground">
                    Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem contact met ons op als het probleem aanhoudt.
                </p>
                {error.digest && (
                    <p className="text-xs text-muted-foreground font-mono">Foutcode: {error.digest}</p>
                )}
                <Button onClick={reset}>Opnieuw proberen</Button>
            </div>
        </div>
    )
}
