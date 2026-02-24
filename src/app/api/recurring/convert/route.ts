
import { convertRecurringOrdersToReal } from '@/app/admin/actions'
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

    try {
        const result = await convertRecurringOrdersToReal()
        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
