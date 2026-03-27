import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const limiters = new Map<string, Ratelimit>()

function getLimiter(windowMs: number, max: number): Ratelimit {
    const key = `${windowMs}:${max}`
    let limiter = limiters.get(key)
    if (!limiter) {
        limiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
            prefix: 'ratelimit',
        })
        limiters.set(key, limiter)
    }
    return limiter
}

/**
 * Redis-backed rate limiter for API routes using Upstash.
 * Works across multiple serverless instances.
 *
 * Requires env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */
export function rateLimit(options: { windowMs?: number; max?: number } = {}) {
    const { windowMs = 60_000, max = 10 } = options
    const limiter = getLimiter(windowMs, max)

    return async function checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req.headers.get('x-real-ip')
            ?? 'unknown'

        const identifier = `${ip}:${req.nextUrl.pathname}`
        const { success, reset } = await limiter.limit(identifier)

        if (!success) {
            const retryAfter = Math.ceil((reset - Date.now()) / 1000)
            return NextResponse.json(
                { success: false, error: 'Too many requests, please try again later' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.max(retryAfter, 1)),
                    },
                },
            )
        }

        return null
    }
}
