import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        updateStatus: vi.fn(),
    },
}))

import { requireAdmin } from '@/lib/auth/requireAdmin'
import { orderService } from '@/services/order.service'
import { PATCH } from '@/app/api/orders/[id]/status/route'
import { NextRequest } from 'next/server'

const mockAuth = requireAdmin as any
const mockService = orderService as any

beforeEach(() => {
    vi.clearAllMocks()
})

const makeRequest = (body: object) =>
    new NextRequest(new URL('http://localhost:3000/api/orders/order-1/status'), {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    })

const makeContext = (id = 'order-1') => ({ params: Promise.resolve({ id }) })

// ---------------------------------------------------------------------------
// PATCH /api/orders/[id]/status
// ---------------------------------------------------------------------------

describe('PATCH /api/orders/[id]/status', () => {
    it('returns 403 when caller is not an admin', async () => {
        mockAuth.mockResolvedValue(null)

        const req = makeRequest({ status: 'confirmed' })
        const res = await PATCH(req, makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 422 when status value is not a valid enum member', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

        const req = makeRequest({ status: 'invalid-status' })
        const res = await PATCH(req, makeContext())

        expect(res.status).toBe(422)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 200 with updated order on valid admin request', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        const updatedOrder = { id: 'order-1', status: 'confirmed' }
        mockService.updateStatus.mockResolvedValue(updatedOrder)

        const req = makeRequest({ status: 'confirmed' })
        const res = await PATCH(req, makeContext())

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.status).toBe('confirmed')
        expect(mockService.updateStatus).toHaveBeenCalledWith('order-1', 'confirmed')
    })
})
