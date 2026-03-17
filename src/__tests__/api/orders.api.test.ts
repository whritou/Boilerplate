import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        getAll: vi.fn(),
        getByUserId: vi.fn(),
        createFromCart: vi.fn(),
    },
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { orderService } from '@/services/order.service'
import { GET, POST } from '@/app/api/orders/route'
import { NextRequest } from 'next/server'

const mockAuth = requireUser as any
const mockService = orderService as any

beforeEach(() => {
    vi.clearAllMocks()
})

describe('GET /api/orders', () => {
    it('returns 403 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null)

        const req = new NextRequest(new URL('http://localhost:3000/api/orders'))
        const res = await GET(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(403)
    })

    it('returns user orders for regular user', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        mockService.getAll.mockResolvedValue({
            data: [{ id: 'ord-1' }],
            meta: { total: 1 }
        })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders'))
        const res = await GET(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data).toHaveLength(1)
    })
})

describe('POST /api/orders', () => {
    it('returns 403 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null)
        const req = new NextRequest(new URL('http://localhost:3000/api/orders'), { method: 'POST' })
        const res = await POST(req, { params: Promise.resolve({}) })
        expect(res.status).toBe(403)
    })

    it('creates order from cart', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.createFromCart.mockResolvedValue({ id: 'ord-1', status: 'pending' })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders'), { method: 'POST' })
        const res = await POST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.id).toBe('ord-1')
    })
})
