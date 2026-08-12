import { NextRequest, NextResponse } from 'next/server'
import { isHoneypotPath } from '@/lib/honeypot'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getClientIp(request: NextRequest): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }
    return request.headers.get('x-real-ip')
}

async function isIpBlocked(ip: string): Promise<boolean> {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false

    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/blocked_ips?ip=eq.${encodeURIComponent(ip)}&select=ip&limit=1`,
            {
                headers: {
                    apikey: SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                },
                cache: 'no-store',
            }
        )
        if (!res.ok) return false
        const rows = await res.json()
        return Array.isArray(rows) && rows.length > 0
    } catch {
        return false
    }
}

async function flagAndBlockIp(ip: string, route: string, userAgent: string | null) {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/flag_ip_hit`, {
            method: 'POST',
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                p_ip: ip,
                p_reason: 'honeypot',
                p_route: route,
                p_user_agent: userAgent,
            }),
        })
    } catch {
        // Best-effort: a failed flag shouldn't break the response we send back.
    }
}

export async function middleware(request: NextRequest) {
    const ip = getClientIp(request)
    const { pathname } = request.nextUrl

    if (ip && (await isIpBlocked(ip))) {
        return new NextResponse(null, { status: 403 })
    }

    if (isHoneypotPath(pathname)) {
        if (ip) {
            await flagAndBlockIp(ip, pathname, request.headers.get('user-agent'))
        }
        return new NextResponse(null, { status: 404 })
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
