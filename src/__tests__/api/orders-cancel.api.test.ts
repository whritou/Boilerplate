import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        getById: vi.fn(),
        cancel: vi.fn(),
    },
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { orderService } from '@/services/order.service'
import { POST } from '@/app/api/orders/[id]/cancel/route'
import { NextRequest } from 'next/server'

const mockAuth = requireUser as any
const mockService = orderService as any

beforeEach(() => {
    vi.clearAllMocks()
})

const makeRequest = () =>
    new NextRequest(new URL('http://localhost:3000/api/orders/order-1/cancel'), {
        method: 'POST',
    })

const makeContext = (id = 'order-1') => ({ params: Promise.resolve({ id }) })

// ---------------------------------------------------------------------------
// POST /api/orders/[id]/cancel
// ---------------------------------------------------------------------------

describe('POST /api/orders/[id]/cancel', () => {
    it('returns 403 when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null)

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 403 when a regular user tries to cancel another user\'s order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.getById.mockResolvedValue({ id: 'order-1', userId: 'other-user-99' })

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(mockService.cancel).not.toHaveBeenCalled()
    })

    it('returns 200 when a user cancels their own order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        const order = { id: 'order-1', userId: 'user-1', status: 'pending' }
        mockService.getById.mockResolvedValue(order)
        const canceled = { ...order, status: 'canceled' }
        mockService.cancel.mockResolvedValue(canceled)

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.status).toBe('canceled')
        expect(mockService.cancel).toHaveBeenCalledWith('order-1')
    })

    it('returns 200 when an admin cancels any order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        const order = { id: 'order-1', userId: 'other-user-99', status: 'pending' }
        mockService.getById.mockResolvedValue(order)
        const canceled = { ...order, status: 'canceled' }
        mockService.cancel.mockResolvedValue(canceled)

        const res = await POST(makeRequest(), makeContext())

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.status).toBe('canceled')
        expect(mockService.cancel).toHaveBeenCalledWith('order-1')
    })
})
