import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        cancelAndRefund: vi.fn(),
    },
}))

import { requireAdmin } from '@/lib/auth/requireAdmin'
import { orderService } from '@/services/order.service'
import { POST } from '@/app/api/orders/[id]/refund/route'
import { NextRequest } from 'next/server'

const mockAuth = requireAdmin as any
const mockService = orderService as any

beforeEach(() => {
    vi.clearAllMocks()
})

describe('POST /api/orders/[id]/refund', () => {
    it('returns 403 when not admin', async () => {
        mockAuth.mockResolvedValue(null)

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1/refund'), { method: 'POST' })
        const res = await POST(req, { params: Promise.resolve({ id: 'ord-1' }) })

        expect(res.status).toBe(403)
    })

    it('refunds order when admin', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockService.cancelAndRefund.mockResolvedValue({
            id: 'ord-1',
            status: 'canceled',
            paymentStatus: 'refunded',
        })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1/refund'), { method: 'POST' })
        const res = await POST(req, { params: Promise.resolve({ id: 'ord-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.status).toBe('canceled')
        expect(json.data.paymentStatus).toBe('refunded')
        expect(mockService.cancelAndRefund).toHaveBeenCalledWith('ord-1')
    })
})
