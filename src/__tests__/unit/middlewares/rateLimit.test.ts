import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Upstash Redis and Ratelimit so we don't need a real Redis connection
const mockLimit = vi.fn()

vi.mock('@upstash/redis', () => ({
    Redis: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@upstash/ratelimit', () => ({
    Ratelimit: vi.fn().mockImplementation(() => ({
        limit: mockLimit,
    })),
}))

let rateLimit: typeof import('@/middlewares/rateLimit').rateLimit

beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    // Re-mock after resetModules
    vi.doMock('@upstash/redis', () => ({
        Redis: vi.fn().mockImplementation(() => ({})),
    }))
    vi.doMock('@upstash/ratelimit', () => ({
        Ratelimit: vi.fn().mockImplementation(() => ({
            limit: mockLimit,
        })),
    }))

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
    it('allows the request when under the limit (returns null)', async () => {
        mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })

        const check = rateLimit({ windowMs: 60_000, max: 10 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '1.2.3.4' })
        const result = await check(req)

        expect(result).toBeNull()
    })

    it('returns a 429 NextResponse when rate limit is exceeded', async () => {
        mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 30_000 })

        const check = rateLimit({ windowMs: 60_000, max: 3 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.1' })

        const result = await check(req)

        expect(result).not.toBeNull()
        expect(result!.status).toBe(429)

        const body = await result!.json()
        expect(body.success).toBe(false)
    })

    it('includes Retry-After header in 429 response', async () => {
        const resetTime = Date.now() + 45_000
        mockLimit.mockResolvedValue({ success: false, reset: resetTime })

        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.2' })

        const result = await check(req)

        expect(result).not.toBeNull()
        const retryAfter = result!.headers.get('Retry-After')
        expect(retryAfter).toBeTruthy()
        expect(Number(retryAfter)).toBeGreaterThan(0)
    })

    it('uses x-forwarded-for header for IP identification', async () => {
        mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })

        const check = rateLimit({ windowMs: 60_000, max: 1 })

        const reqA = makeRequest('/api/test', { 'x-forwarded-for': '1.1.1.1' })
        const reqB = makeRequest('/api/test', { 'x-forwarded-for': '2.2.2.2' })

        await check(reqA)
        await check(reqB)

        // Verify limit() was called with different identifiers
        const calls = mockLimit.mock.calls
        expect(calls[0][0]).toContain('1.1.1.1')
        expect(calls[1][0]).toContain('2.2.2.2')
    })

    it('uses x-forwarded-for first value when multiple IPs are listed', async () => {
        mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })

        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const req = makeRequest('/api/test', { 'x-forwarded-for': '3.3.3.3, 4.4.4.4' })

        await check(req)

        expect(mockLimit.mock.calls[0][0]).toContain('3.3.3.3')
        expect(mockLimit.mock.calls[0][0]).not.toContain('4.4.4.4')
    })

    it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
        mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })

        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const req = makeRequest('/api/test', { 'x-real-ip': '7.7.7.7' })

        await check(req)

        expect(mockLimit.mock.calls[0][0]).toContain('7.7.7.7')
    })

    it('treats requests without any IP header as "unknown"', async () => {
        mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })

        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const req = makeRequest('/api/test')

        await check(req)

        expect(mockLimit.mock.calls[0][0]).toContain('unknown')
    })

    it('keys are scoped per pathname', async () => {
        mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 })

        const check = rateLimit({ windowMs: 60_000, max: 1 })
        const ip = { 'x-forwarded-for': '5.5.5.5' }

        const reqA = makeRequest('/api/users', ip)
        const reqB = makeRequest('/api/products', ip)

        await check(reqA)
        await check(reqB)

        // Same IP but different paths → different identifiers
        expect(mockLimit.mock.calls[0][0]).toContain('/api/users')
        expect(mockLimit.mock.calls[1][0]).toContain('/api/products')
    })
})
