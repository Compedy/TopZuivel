import { timingSafeEqual } from 'crypto'

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if both strings are equal.
 */
export function timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        // Compare against b anyway to avoid leaking length info via timing
        const dummy = Buffer.from(b)
        timingSafeEqual(dummy, dummy)
        return false
    }
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
