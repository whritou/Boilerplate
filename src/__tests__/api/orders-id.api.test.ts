import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        getById: vi.fn(),
        updateShippingAddress: vi.fn(),
    },
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { orderService } from '@/services/order.service'
import { GET, PATCH } from '@/app/api/orders/[id]/route'
import { NextRequest } from 'next/server'

const mockAuth = requireUser as any
const mockService = orderService as any

beforeEach(() => {
    vi.clearAllMocks()
})

describe('GET /api/orders/[id]', () => {
    it('returns 403 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null)

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'))
        const res = await GET(req, { params: Promise.resolve({ id: 'ord-1' }) })

        expect(res.status).toBe(403)
    })

    it('returns order for owner', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.getById.mockResolvedValue({ id: 'ord-1', userId: 'user-1', status: 'pending' })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'))
        const res = await GET(req, { params: Promise.resolve({ id: 'ord-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.id).toBe('ord-1')
    })

    it('returns 403 when user does not own the order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.getById.mockResolvedValue({ id: 'ord-1', userId: 'user-2', status: 'pending' })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'))
        const res = await GET(req, { params: Promise.resolve({ id: 'ord-1' }) })

        expect(res.status).toBe(403)
    })

    it('allows admin to access any order', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockService.getById.mockResolvedValue({ id: 'ord-1', userId: 'user-2', status: 'pending' })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'))
        const res = await GET(req, { params: Promise.resolve({ id: 'ord-1' }) })

        expect(res.status).toBe(200)
    })
})

describe('PATCH /api/orders/[id]', () => {
    const validAddress = {
        shippingFirstName: 'John',
        shippingLastName: 'Doe',
        shippingStreet: '123 Main St',
        shippingCity: 'Paris',
        shippingZipCode: '75001',
        shippingCountry: 'France',
    }

    it('returns 403 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null)

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'), {
            method: 'PATCH',
            body: JSON.stringify(validAddress),
        })
        const res = await PATCH(req, { params: Promise.resolve({ id: 'ord-1' }) })

        expect(res.status).toBe(403)
    })

    it('updates shipping address successfully', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.updateShippingAddress.mockResolvedValue({ id: 'ord-1', ...validAddress })

        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'), {
            method: 'PATCH',
            body: JSON.stringify(validAddress),
            headers: { 'Content-Type': 'application/json' },
        })
        const res = await PATCH(req, { params: Promise.resolve({ id: 'ord-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.shippingFirstName).toBe('John')
        expect(mockService.updateShippingAddress).toHaveBeenCalledWith('ord-1', 'user-1', validAddress)
    })

    it('returns 400 for invalid address (missing required field)', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const { shippingCity, ...incomplete } = validAddress
        const req = new NextRequest(new URL('http://localhost:3000/api/orders/ord-1'), {
            method: 'PATCH',
            body: JSON.stringify(incomplete),
            headers: { 'Content-Type': 'application/json' },
        })
        const res = await PATCH(req, { params: Promise.resolve({ id: 'ord-1' }) })

        expect(res.status).toBe(422)
    })
})
