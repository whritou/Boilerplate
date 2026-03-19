import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// rateLimit uses a module-level Map store, so we reset modules before each test
// to get a fresh store.
let rateLimit: typeof import('@/middlewares/rateLimit').rateLimit

beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/middlewares/rateLimit')
    rateLimit = mod.rateLimit
})

afterEach(() => {
    vi.useRealTimers()
})

function makeRequest(
    pathname = '/api/test',
    headers: Record<string, string> = {}
): NextRequest {
    const url = `http://localhost${pathname}`
    return new NextRequest(url, { headers })
}

describe('rateLimit', () => {
    it('allows the first request (returns null)', () => {
        const check = rateLimit({ windowMs: 60_000, max: 10 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' })
        const result = check(req)
        expect(result).toBeNull()
    })

    it('allows requests up to the max limit (returns null)', () => {
        const check = rateLimit({ windowMs: 60_000, max: 5 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' })

        // First request initialises the entry at count 1, subsequent ones increment
        // The implementation returns null while count <= max
        for (let i = 0; i < 5; i++) {
            const result = check(req)
            expect(result, `request ${i + 1} should be allowed`).toBeNull()
        }
    })

    it('returns a 429 NextResponse when request count exceeds max', async () => {
        const check = rateLimit({ windowMs: 60_000, max: 3 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.1' })

        // Exhaust the limit
        for (let i = 0; i < 3; i++) {
            check(req)
        }

        // This one goes over
        const result = check(req)
        expect(result).not.toBeNull()
        expect(result!.status).toBe(429)

        const body = await result!.json()
        expect(body.success).toBe(false)
    })

    it('includes Retry-After header in 429 response', () => {
        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.2' })

        check(req) // count = 1
        const result = check(req) // count = 2 > max (1)

        expect(result).not.toBeNull()
        const retryAfter = result!.headers.get('Retry-After')
        expect(retryAfter).toBeTruthy()
        expect(Number(retryAfter)).toBeGreaterThan(0)
    })

    it('resets the counter after the window expires', async () => {
        vi.useFakeTimers()

        // We need a fresh module after fake timers are set up so Date.now() is mocked
        vi.resetModules()
        const mod = await import('@/middlewares/rateLimit')
        const freshRateLimit = mod.rateLimit

        const check = freshRateLimit({ windowMs: 5_000, max: 2 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '9.9.9.9' })

        // Exhaust the limit
        check(req) // count = 1
        check(req) // count = 2
        const blocked = check(req) // count = 3 > max
        expect(blocked).not.toBeNull()
        expect(blocked!.status).toBe(429)

        // Advance time past the window
        vi.advanceTimersByTime(6_000)

        // Now the entry should have expired → new window starts → allowed
        const afterReset = check(req)
        expect(afterReset).toBeNull()
    })

    it('uses x-forwarded-for header for IP identification', () => {
        const check = rateLimit({ windowMs: 60_000, max: 1 })

        const reqA = makeRequest('/api/test', { 'x-forwarded-for': '1.1.1.1' })
        const reqB = makeRequest('/api/test', { 'x-forwarded-for': '2.2.2.2' })

        // Both first requests should be allowed (different IPs = different keys)
        expect(check(reqA)).toBeNull()
        expect(check(reqB)).toBeNull()
    })

    it('uses x-forwarded-for first value when multiple IPs are listed', () => {
        const check = rateLimit({ windowMs: 60_000, max: 1 })

        // Multiple IPs: first is the client IP
        const req = makeRequest('/api/test', { 'x-forwarded-for': '3.3.3.3, 4.4.4.4' })
        expect(check(req)).toBeNull()

        // Sending again should increment the same key (3.3.3.3)
        const req2 = makeRequest('/api/test', { 'x-forwarded-for': '3.3.3.3, 5.5.5.5' })
        const result = check(req2) // count = 2 > max (1)
        expect(result).not.toBeNull()
        expect(result!.status).toBe(429)
    })

    it('falls back to x-real-ip when x-forwarded-for is absent', () => {
        const check = rateLimit({ windowMs: 60_000, max: 1 })

        const req = makeRequest('/api/test', { 'x-real-ip': '7.7.7.7' })
        expect(check(req)).toBeNull()

        const req2 = makeRequest('/api/test', { 'x-real-ip': '7.7.7.7' })
        const result = check(req2) // count = 2 > max (1)
        expect(result).not.toBeNull()
        expect(result!.status).toBe(429)
    })

    it('treats requests without any IP header as the same "unknown" key', () => {
        const check = rateLimit({ windowMs: 60_000, max: 1 })

        const req1 = makeRequest('/api/test')
        const req2 = makeRequest('/api/test')

        expect(check(req1)).toBeNull()
        const result = check(req2) // both "unknown" → same key → count exceeds max
        expect(result).not.toBeNull()
        expect(result!.status).toBe(429)
    })

    it('keys are scoped per pathname', () => {
        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const ip = { 'x-forwarded-for': '5.5.5.5' }

        const reqA = makeRequest('/api/users', ip)
        const reqB = makeRequest('/api/products', ip)

        // Same IP but different paths → different keys → both allowed
        expect(check(reqA)).toBeNull()
        expect(check(reqB)).toBeNull()
    })

    it('uses default values when no options are provided', () => {
        const check = rateLimit()
        const req = makeRequest('/api/test', { 'x-forwarded-for': '8.8.8.8' })
        // Default max is 10, so 10 requests should all be allowed
        for (let i = 0; i < 10; i++) {
            expect(check(req)).toBeNull()
        }
        // 11th should be blocked
        expect(check(req)).not.toBeNull()
    })

    it('cleanup removes expired store entries after CLEANUP_INTERVAL has passed', async () => {
        vi.useFakeTimers()

        // Fresh module with fake timers active so Date.now() is controlled
        vi.resetModules()
        const mod = await import('@/middlewares/rateLimit')
        const freshRateLimit = mod.rateLimit

        const check = freshRateLimit({ windowMs: 1_000, max: 100 })
        const req = makeRequest('/api/cleanup-test', { 'x-forwarded-for': '6.6.6.6' })

        // Make a request — creates an entry with resetAt = now + 1000ms
        check(req)

        // Advance time past the entry's window so the entry becomes expired
        vi.advanceTimersByTime(2_000)

        // Advance past CLEANUP_INTERVAL (60_000ms) so cleanup() actually runs
        vi.advanceTimersByTime(60_000)

        // This request triggers cleanup() — it should delete the stale entry
        // and create a fresh one (count resets to 1, not blocked)
        const result = check(req)
        expect(result).toBeNull()
    })
})
