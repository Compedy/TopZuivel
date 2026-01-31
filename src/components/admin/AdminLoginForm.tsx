'use client'

import { useState } from 'react'
import { adminLogin } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminLoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        try {
            const result = await adminLogin(formData)
            if (!result.success) {
                setError(result.error || 'Inloggen mislukt')
            }
            // On success, the action validates via redirect or subsequent navigation logic
        } catch (e) {
            setError('Er is een onverwachte fout opgetreden.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Admin Inloggen</h2>
                    <p className="mt-2 text-sm text-gray-600">Voer uw gegevens in om verder te gaan.</p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Gebruikersnaam</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="block w-full"
                                placeholder="Admin"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Wachtwoord</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full pr-10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 text-center font-medium bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Bezig met inloggen...' : 'Inloggen'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
