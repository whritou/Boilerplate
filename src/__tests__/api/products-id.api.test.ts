import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/product.service', () => ({
    productService: {
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}))

import { requireAdmin } from '@/lib/auth/requireAdmin'
import { productService } from '@/services/product.service'
import { GET, PATCH, DELETE } from '@/app/api/products/[id]/route'
import { NextRequest } from 'next/server'

const mockRequireAdmin = requireAdmin as ReturnType<typeof vi.fn>
const mockProductService = productService as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
    vi.clearAllMocks()
})

function makeRequest(url: string, options?: RequestInit) {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

const fakeProduct = {
    id: 'prod-1',
    name: 'Widget',
    description: 'A widget',
    price: 29.99,
    quantity: 50,
    isArchived: false,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// GET /api/products/[id]
// ---------------------------------------------------------------------------

describe('GET /api/products/[id]', () => {
    it('returns the product without requiring authentication', async () => {
        mockProductService.getById.mockResolvedValue(fakeProduct)

        const req = makeRequest('http://localhost:3000/api/products/prod-1')
        const res = await GET(req, { params: Promise.resolve({ id: 'prod-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.id).toBe('prod-1')
        expect(mockRequireAdmin).not.toHaveBeenCalled()
    })

    it('calls productService.getById with the correct id', async () => {
        mockProductService.getById.mockResolvedValue(fakeProduct)

        const req = makeRequest('http://localhost:3000/api/products/prod-1')
        await GET(req, { params: Promise.resolve({ id: 'prod-1' }) })

        expect(mockProductService.getById).toHaveBeenCalledWith('prod-1')
    })
})

// ---------------------------------------------------------------------------
// PATCH /api/products/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/products/[id]', () => {
    it('returns 403 when user is not admin', async () => {
        mockRequireAdmin.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/products/prod-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Widget' }),
        })

        const res = await PATCH(req, { params: Promise.resolve({ id: 'prod-1' }) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
        expect(mockProductService.update).not.toHaveBeenCalled()
    })

    it('returns 200 with updated product when admin provides valid body', async () => {
        mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockProductService.update.mockResolvedValue({ ...fakeProduct, name: 'Updated Widget' })

        const req = makeRequest('http://localhost:3000/api/products/prod-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Updated Widget' }),
        })

        const res = await PATCH(req, { params: Promise.resolve({ id: 'prod-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.name).toBe('Updated Widget')
        expect(mockProductService.update).toHaveBeenCalledWith('prod-1', { name: 'Updated Widget' })
    })

    it('returns 422 when admin provides invalid body (price below minimum)', async () => {
        mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

        const req = makeRequest('http://localhost:3000/api/products/prod-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: -10 }),
        })

        const res = await PATCH(req, { params: Promise.resolve({ id: 'prod-1' }) })
        const json = await res.json()

        expect(res.status).toBe(422)
        expect(json.success).toBe(false)
    })

    it('passes price in the update payload when provided', async () => {
        mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockProductService.update.mockResolvedValue({ ...fakeProduct, price: 49.99 })

        const req = makeRequest('http://localhost:3000/api/products/prod-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: 49.99 }),
        })

        const res = await PATCH(req, { params: Promise.resolve({ id: 'prod-1' }) })

        expect(res.status).toBe(200)
        expect(mockProductService.update).toHaveBeenCalledWith('prod-1', { price: 49.99 })
    })
})

// ---------------------------------------------------------------------------
// DELETE /api/products/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/products/[id]', () => {
    it('returns 403 when user is not admin', async () => {
        mockRequireAdmin.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/products/prod-1', {
            method: 'DELETE',
        })

        const res = await DELETE(req, { params: Promise.resolve({ id: 'prod-1' }) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
        expect(mockProductService.delete).not.toHaveBeenCalled()
    })

    it('returns 204 when admin deletes an existing product', async () => {
        mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockProductService.delete.mockResolvedValue(undefined)

        const req = makeRequest('http://localhost:3000/api/products/prod-1', {
            method: 'DELETE',
        })

        const res = await DELETE(req, { params: Promise.resolve({ id: 'prod-1' }) })

        expect(res.status).toBe(204)
        expect(mockProductService.delete).toHaveBeenCalledWith('prod-1')
    })
})
