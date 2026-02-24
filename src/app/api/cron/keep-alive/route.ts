
import { wakeUpDatabase } from '@/app/admin/actions'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // Basic protection using a secret from environment
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const authHeader = request.headers.get('authorization')

    if (
        process.env.CRON_SECRET &&
        secret !== process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
