import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/order.service', () => ({
    orderService: {
        cancelAllExpired: vi.fn(),
    },
}))

import { orderService } from '@/services/order.service'
import { POST } from '@/app/api/orders/cleanup-expired/route'
import { NextRequest } from 'next/server'

const mockService = orderService as any

beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
})

const makeRequest = (authHeader?: string) => {
    const headers: Record<string, string> = {}
    if (authHeader !== undefined) headers['authorization'] = authHeader
    return new NextRequest(new URL('http://localhost:3000/api/orders/cleanup-expired'), {
        method: 'POST',
        headers,
    })
}

// ---------------------------------------------------------------------------
// POST /api/orders/cleanup-expired
// ---------------------------------------------------------------------------

describe('POST /api/orders/cleanup-expired', () => {
    it('returns 401 when authorization header is missing', async () => {
        const req = makeRequest()
        const res = await POST(req)

        expect(res.status).toBe(401)
        const json = await res.json()
        expect(json.error).toBe('Unauthorized')
    })

    it('returns 401 when authorization header has wrong secret', async () => {
        const req = makeRequest('Bearer wrong-secret')
        const res = await POST(req)

        expect(res.status).toBe(401)
        const json = await res.json()
        expect(json.error).toBe('Unauthorized')
    })

    it('returns 200 with canceledCount on valid POST', async () => {
        mockService.cancelAllExpired.mockResolvedValue(3)

        const req = makeRequest('Bearer test-secret')
        const res = await POST(req)

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.expiredCount).toBe(3)
        expect(mockService.cancelAllExpired).toHaveBeenCalledOnce()
    })

    it('returns 500 when orderService.cancelAllExpired throws', async () => {
        mockService.cancelAllExpired.mockRejectedValue(new Error('DB failure'))

        const req = makeRequest('Bearer test-secret')
        const res = await POST(req)

        expect(res.status).toBe(500)
    })
})
