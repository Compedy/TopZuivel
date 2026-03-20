
import { convertRecurringOrdersToReal } from '@/app/admin/actions'
import { NextResponse } from 'next/server'
import { timingSafeCompare } from '@/lib/crypto-utils'

export async function GET(request: Request) {
    // Basic protection using a secret from environment
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const authHeader = request.headers.get('authorization')

    const cronSecret = process.env.CRON_SECRET
    if (
        cronSecret &&
        !timingSafeCompare(secret ?? '', cronSecret) &&
        !timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await convertRecurringOrdersToReal()
        return NextResponse.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
