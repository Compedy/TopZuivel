
import { wakeUpDatabase } from '@/app/admin/actions'
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

    // Skip on Fridays as the recurring order job already handles this
    const today = new Date().getDay()
    if (today === 5) { // 5 is Friday
        return NextResponse.json({ message: 'Skipped: Friday is handled by recurring orders job.' })
    }

    try {
        const result = await wakeUpDatabase()
        return NextResponse.json({
            message: 'Database keep-alive successful',
            ...result
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
