import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/cart.service', () => ({
    cartService: {
        getByUserId: vi.fn(),
        addItem: vi.fn(),
        clear: vi.fn(),
    },
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { cartService } from '@/services/cart.service'
import { GET } from '@/app/api/cart/route'
import { NextRequest } from 'next/server'

const mockAuth = requireUser as any
const mockService = cartService as any

beforeEach(() => {
    vi.clearAllMocks()
})

describe('GET /api/cart', () => {
    it('returns 403 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null)

        const req = new NextRequest(new URL('http://localhost:3000/api/cart'))
        const res = await GET(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(403)
    })

    it('returns cart for authenticated user', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.getByUserId.mockResolvedValue({
            id: 'cart-1',
            userId: 'user-1',
            items: [],
        })

        const req = new NextRequest(new URL('http://localhost:3000/api/cart'))
        const res = await GET(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.userId).toBe('user-1')
    })
})
