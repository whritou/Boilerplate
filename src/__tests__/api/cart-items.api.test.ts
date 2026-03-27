import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/cart.service', () => ({
    cartService: {
        clear: vi.fn(),
        addItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        removeItem: vi.fn(),
    },
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { cartService } from '@/services/cart.service'
import { POST as clearPOST } from '@/app/api/cart/clear/route'
import { POST as addItemPOST } from '@/app/api/cart/items/route'
import { PATCH as updateItemPATCH, DELETE as removeItemDELETE } from '@/app/api/cart/items/[itemId]/route'
import { NextRequest } from 'next/server'

const mockRequireUser = requireUser as ReturnType<typeof vi.fn>
const mockCartService = cartService as unknown as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
    vi.clearAllMocks()
})

function makeRequest(url: string, options?: RequestInit) {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options as any)
}

const fakeCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [],
}

// ---------------------------------------------------------------------------
// POST /api/cart/clear
// ---------------------------------------------------------------------------

describe('POST /api/cart/clear', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/cart/clear', { method: 'POST' })
        const res = await clearPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 200 and clears the cart when authenticated', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockCartService.clear.mockResolvedValue(fakeCart)

        const req = makeRequest('http://localhost:3000/api/cart/clear', { method: 'POST' })
        const res = await clearPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(mockCartService.clear).toHaveBeenCalledWith('user-1')
    })
})

// ---------------------------------------------------------------------------
// POST /api/cart/items
// ---------------------------------------------------------------------------

describe('POST /api/cart/items', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: 'prod-1', quantity: 2 }),
        })

        const res = await addItemPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 200 with updated cart on valid body', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockCartService.addItem.mockResolvedValue({
            ...fakeCart,
            items: [{ productId: 'prod-1', quantity: 2 }],
        })

        const req = makeRequest('http://localhost:3000/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: 'prod-1', quantity: 2 }),
        })

        const res = await addItemPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(mockCartService.addItem).toHaveBeenCalledWith('user-1', 'prod-1', 2)
    })

    it('returns 422 when body is invalid (missing productId)', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = makeRequest('http://localhost:3000/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 2 }),
        })

        const res = await addItemPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(422)
        expect(json.success).toBe(false)
    })

    it('returns 422 when quantity is below minimum', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = makeRequest('http://localhost:3000/api/cart/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: 'prod-1', quantity: 0 }),
        })

        const res = await addItemPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(422)
        expect(json.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// PATCH /api/cart/items/[itemId]
// ---------------------------------------------------------------------------

describe('PATCH /api/cart/items/[itemId]', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/cart/items/item-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 3 }),
        })

        const res = await updateItemPATCH(req, { params: Promise.resolve({ itemId: 'item-1' }) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 200 with updated cart on valid request', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockCartService.updateItemQuantity.mockResolvedValue({
            ...fakeCart,
            items: [{ productId: 'prod-1', quantity: 3 }],
        })

        const req = makeRequest('http://localhost:3000/api/cart/items/item-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 3 }),
        })

        const res = await updateItemPATCH(req, { params: Promise.resolve({ itemId: 'item-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(mockCartService.updateItemQuantity).toHaveBeenCalledWith('user-1', 'item-1', 3)
    })

    it('returns 422 when quantity is not a valid integer', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = makeRequest('http://localhost:3000/api/cart/items/item-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 'many' }),
        })

        const res = await updateItemPATCH(req, { params: Promise.resolve({ itemId: 'item-1' }) })
        const json = await res.json()

        expect(res.status).toBe(422)
        expect(json.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// DELETE /api/cart/items/[itemId]
// ---------------------------------------------------------------------------

describe('DELETE /api/cart/items/[itemId]', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/cart/items/item-1', {
            method: 'DELETE',
        })

        const res = await removeItemDELETE(req, { params: Promise.resolve({ itemId: 'item-1' }) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 200 with updated cart on valid request', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockCartService.removeItem.mockResolvedValue(fakeCart)

        const req = makeRequest('http://localhost:3000/api/cart/items/item-1', {
            method: 'DELETE',
        })

        const res = await removeItemDELETE(req, { params: Promise.resolve({ itemId: 'item-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(mockCartService.removeItem).toHaveBeenCalledWith('user-1', 'item-1')
    })
})
