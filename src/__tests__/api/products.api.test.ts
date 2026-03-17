import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/product.service', () => ({
    productService: {
        getAll: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}))

import { requireAdmin } from '@/lib/auth/requireAdmin'
import { productService } from '@/services/product.service'
import { GET, POST } from '@/app/api/products/route'
import { NextRequest } from 'next/server'

const mockAuth = requireAdmin as any
const mockService = productService as any

beforeEach(() => {
    vi.clearAllMocks()
})

function createRequest(url: string, options?: any) {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

describe('GET /api/products', () => {
    it('returns paginated products', async () => {
        mockService.getAll.mockResolvedValue({
            data: [{ id: 'p1', name: 'Widget' }],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        })

        const req = createRequest('http://localhost:3000/api/products?page=1')
        const res = await GET(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data).toHaveLength(1)
    })
})

describe('POST /api/products', () => {
    it('returns 403 when not admin', async () => {
        mockAuth.mockResolvedValue(null)

        const req = createRequest('http://localhost:3000/api/products', {
            method: 'POST',
            body: JSON.stringify({ name: 'Test', price: 10, quantity: 1 }),
        })

        const res = await POST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('creates product when admin', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockService.create.mockResolvedValue({ id: 'p1', name: 'New Product' })

        const req = createRequest('http://localhost:3000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'New Product', price: 25.00, quantity: 10 }),
        })

        const res = await POST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.name).toBe('New Product')
    })
})
