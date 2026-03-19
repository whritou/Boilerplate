import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/payment.service', () => ({
    paymentService: {
        createPaymentIntent: vi.fn(),
        createCheckoutSession: vi.fn(),
        getById: vi.fn(),
    },
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        getById: vi.fn(),
    },
}))

vi.mock('@/middlewares/rateLimit', () => ({
    rateLimit: () => () => null,
}))

import { requireUser } from '@/lib/auth/requireAdmin'
import { paymentService } from '@/services/payment.service'
import { orderService } from '@/services/order.service'
import { POST as createIntentPOST } from '@/app/api/payments/create-intent/route'
import { POST as checkoutPOST } from '@/app/api/payments/checkout/route'
import { GET as paymentGET } from '@/app/api/payments/[id]/route'
import { NextRequest } from 'next/server'

const mockRequireUser = requireUser as ReturnType<typeof vi.fn>
const mockPaymentService = paymentService as Record<string, ReturnType<typeof vi.fn>>
const mockOrderService = orderService as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
    vi.clearAllMocks()
})

function makeRequest(url: string, options?: RequestInit) {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options)
}

// ---------------------------------------------------------------------------
// POST /api/payments/create-intent
// ---------------------------------------------------------------------------

describe('POST /api/payments/create-intent', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/payments/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: 'order-1' }),
        })

        const res = await createIntentPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 403 when user tries to create intent for another user\'s order', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-2' })

        const req = makeRequest('http://localhost:3000/api/payments/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: 'order-1' }),
        })

        const res = await createIntentPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 200 with clientSecret on valid request', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-1' })
        mockPaymentService.createPaymentIntent.mockResolvedValue({
            clientSecret: 'pi_secret_test',
        })

        const req = makeRequest('http://localhost:3000/api/payments/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: 'order-1' }),
        })

        const res = await createIntentPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.clientSecret).toBe('pi_secret_test')
    })

    it('admin can create intent for any user\'s order', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-2' })
        mockPaymentService.createPaymentIntent.mockResolvedValue({
            clientSecret: 'pi_secret_admin',
        })

        const req = makeRequest('http://localhost:3000/api/payments/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: 'order-1' }),
        })

        const res = await createIntentPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.clientSecret).toBe('pi_secret_admin')
    })
})

// ---------------------------------------------------------------------------
// POST /api/payments/checkout
// ---------------------------------------------------------------------------

describe('POST /api/payments/checkout', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: 'order-1',
                successUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel',
            }),
        })

        const res = await checkoutPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 422 when successUrl is missing', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = makeRequest('http://localhost:3000/api/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: 'order-1',
                cancelUrl: 'https://example.com/cancel',
            }),
        })

        const res = await checkoutPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(422)
        expect(json.success).toBe(false)
    })

    it('returns 422 when cancelUrl is missing', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = makeRequest('http://localhost:3000/api/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: 'order-1',
                successUrl: 'https://example.com/success',
            }),
        })

        const res = await checkoutPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(422)
        expect(json.success).toBe(false)
    })

    it('returns 200 with checkout session on valid request', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-1' })
        mockPaymentService.createCheckoutSession.mockResolvedValue({
            url: 'https://checkout.stripe.com/session-url',
            id: 'cs_test_123',
        })

        const req = makeRequest('http://localhost:3000/api/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: 'order-1',
                successUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel',
            }),
        })

        const res = await checkoutPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.id).toBe('cs_test_123')
    })

    it('returns 403 when user tries to checkout another user\'s order', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-2' })

        const req = makeRequest('http://localhost:3000/api/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: 'order-1',
                successUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel',
            }),
        })

        const res = await checkoutPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('admin can checkout for any order', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-2' })
        mockPaymentService.createCheckoutSession.mockResolvedValue({
            url: 'https://checkout.stripe.com/admin-session',
            id: 'cs_admin_123',
        })

        const req = makeRequest('http://localhost:3000/api/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: 'order-1',
                successUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel',
            }),
        })

        const res = await checkoutPOST(req, { params: Promise.resolve({}) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// GET /api/payments/[id]
// ---------------------------------------------------------------------------

describe('GET /api/payments/[id]', () => {
    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const req = makeRequest('http://localhost:3000/api/payments/pay-1')

        const res = await paymentGET(req, { params: Promise.resolve({ id: 'pay-1' }) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('returns 200 when user fetches their own payment', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockPaymentService.getById.mockResolvedValue({ id: 'pay-1', orderId: 'order-1' })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-1' })

        const req = makeRequest('http://localhost:3000/api/payments/pay-1')

        const res = await paymentGET(req, { params: Promise.resolve({ id: 'pay-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.id).toBe('pay-1')
    })

    it('returns 403 when user tries to fetch another user\'s payment', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockPaymentService.getById.mockResolvedValue({ id: 'pay-1', orderId: 'order-1' })
        mockOrderService.getById.mockResolvedValue({ id: 'order-1', userId: 'user-2' })

        const req = makeRequest('http://localhost:3000/api/payments/pay-1')

        const res = await paymentGET(req, { params: Promise.resolve({ id: 'pay-1' }) })
        const json = await res.json()

        expect(res.status).toBe(403)
        expect(json.success).toBe(false)
    })

    it('admin can fetch any payment', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockPaymentService.getById.mockResolvedValue({ id: 'pay-1', orderId: 'order-1' })

        const req = makeRequest('http://localhost:3000/api/payments/pay-1')

        const res = await paymentGET(req, { params: Promise.resolve({ id: 'pay-1' }) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.id).toBe('pay-1')
        expect(mockOrderService.getById).not.toHaveBeenCalled()
    })
})
