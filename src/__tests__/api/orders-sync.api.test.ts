import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        getById: vi.fn(),
    },
}))

vi.mock('@/services/payment.service', () => ({
    paymentService: {
        syncPaymentStatus: vi.fn(),
    },
}))

vi.mock('@/middlewares/rateLimit', () => ({
    rateLimit: () => () => null,
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { orderService } from '@/services/order.service'
import { paymentService } from '@/services/payment.service'
import { POST } from '@/app/api/orders/[id]/sync-payment/route'
import { NextRequest } from 'next/server'

const mockAuth = requireUser as any
const mockOrderService = orderService as any
const mockPaymentService = paymentService as any

beforeEach(() => {
    vi.clearAllMocks()
})

const makeRequest = () =>
    new NextRequest(new URL('http://localhost:3000/api/orders/order-1/sync-payment'), {
        method: 'POST',
    })

const makeContext = (id = 'order-1') => ({ params: Promise.resolve({ id }) })

// ---------------------------------------------------------------------------
// POST /api/orders/[id]/sync-payment
// ---------------------------------------------------------------------------

describe('POST /api/orders/[id]/sync-payment', () => {
    it('returns 403 when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null)

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 403 when a user tries to sync another user\'s order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'other-user-99' })

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(mockPaymentService.syncPaymentStatus).not.toHaveBeenCalled()
    })

    it('returns 200 with updated order when user syncs their own order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-1' })
        const updatedOrder = { id: 'order-1', paymentStatus: 'succeeded' }
        mockPaymentService.syncPaymentStatus.mockResolvedValue(updatedOrder)

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.paymentStatus).toBe('succeeded')
        expect(mockPaymentService.syncPaymentStatus).toHaveBeenCalledWith('order-1')
    })

    it('returns 200 when an admin syncs any order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'other-user-99' })
        const updatedOrder = { id: 'order-1', paymentStatus: 'succeeded' }
        mockPaymentService.syncPaymentStatus.mockResolvedValue(updatedOrder)

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(mockPaymentService.syncPaymentStatus).toHaveBeenCalledWith('order-1')
    })
})
