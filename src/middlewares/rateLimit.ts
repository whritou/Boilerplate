import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
    count: number
    resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return
    lastCleanup = now
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key)
    }
}

/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, replace with Redis-based solution (e.g. @upstash/ratelimit).
 */
export function rateLimit(options: { windowMs?: number; max?: number } = {}) {
    const { windowMs = 60_000, max = 10 } = options

    return function checkRateLimit(req: NextRequest): NextResponse | null {
        cleanup()

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req.headers.get('x-real-ip')
            ?? 'unknown'

        const key = `${ip}:${req.nextUrl.pathname}`
        const now = Date.now()
        const entry = store.get(key)

        if (!entry || entry.resetAt <= now) {
            store.set(key, { count: 1, resetAt: now + windowMs })
            return null
        }

        entry.count++

        if (entry.count > max) {
            return NextResponse.json(
                { success: false, error: 'Too many requests, please try again later' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
                    },
                },
            )
        }

        return null
    }
}
