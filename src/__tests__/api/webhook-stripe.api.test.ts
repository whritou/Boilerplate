import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must be hoisted so the env var is set before the route module is imported
// (the route reads STRIPE_WEBHOOK_SECRET at module level, not per-request)
vi.hoisted(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})

vi.mock('@/lib/stripe', () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}))

vi.mock('@/services/payment.service', () => ({
    paymentService: {
        handleCheckoutCompleted: vi.fn(),
        handleStripeWebhook: vi.fn(),
    },
}))

vi.mock('@/repositories/order.repository', () => ({
    orderRepository: {
        findByStripePaymentIntentId: vi.fn(),
        updateStatus: vi.fn(),
        updatePaymentStatus: vi.fn(),
    },
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        cancel: vi.fn(),
    },
}))

import { stripe } from '@/lib/stripe'
import { paymentService } from '@/services/payment.service'
import { orderRepository } from '@/repositories/order.repository'
import { orderService } from '@/services/order.service'
import { POST } from '@/app/api/webhooks/stripe/route'
import { NextRequest } from 'next/server'

const mockStripe = stripe as unknown as { webhooks: { constructEvent: ReturnType<typeof vi.fn> } }
const mockPaymentService = paymentService as unknown as Record<string, ReturnType<typeof vi.fn>>
const mockOrderRepository = orderRepository as unknown as Record<string, ReturnType<typeof vi.fn>>
const mockOrderService = orderService as unknown as Record<string, ReturnType<typeof vi.fn>>

beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})

const makeRequest = (body: string, signature = 'valid-sig') =>
    new NextRequest('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body,
        headers: {
            'stripe-signature': signature,
            'content-type': 'application/json',
        },
    })

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/stripe', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
        const req = new NextRequest('http://localhost/api/webhooks/stripe', {
            method: 'POST',
            body: '{}',
            headers: { 'content-type': 'application/json' },
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toMatch(/Missing stripe-signature/i)
    })

    it('returns 400 when constructEvent throws (invalid signature)', async () => {
        mockStripe.webhooks.constructEvent.mockImplementation(() => {
            throw new Error('Webhook Error: No signatures found matching the expected signature for payload.')
        })

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toMatch(/Invalid signature/i)
    })

    it('handles checkout.session.completed and returns 200 with received: true', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_123' } },
        })
        mockPaymentService.handleCheckoutCompleted.mockResolvedValue(undefined)

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockPaymentService.handleCheckoutCompleted).toHaveBeenCalledWith('cs_123')
    })

    it('handles payment_intent.succeeded and calls handleStripeWebhook with succeeded status', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_123',
                    status: 'succeeded',
                    amount_received: 5000,
                },
            },
        })
        mockPaymentService.handleStripeWebhook.mockResolvedValue(undefined)

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockPaymentService.handleStripeWebhook).toHaveBeenCalledWith('pi_123', 'succeeded', 5000)
    })

    it('handles payment_intent.payment_failed and calls handleStripeWebhook with mapped status', async () => {
        // The webhook route calls mapStripeStatus(paymentIntent.status).
        // For a failed payment, Stripe sets the PaymentIntent status to 'requires_payment_method'
        // (not 'payment_failed' — 'payment_failed' is only the event type name).
        // We pass 'canceled' here to verify the handler is called with whatever mapStripeStatus returns.
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'payment_intent.payment_failed',
            data: {
                object: {
                    id: 'pi_456',
                    status: 'canceled',
                    amount_received: 0,
                },
            },
        })
        mockPaymentService.handleStripeWebhook.mockResolvedValue(undefined)

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockPaymentService.handleStripeWebhook).toHaveBeenCalledWith('pi_456', 'canceled', 0)
    })

    it('handles payment_intent.canceled and calls handleStripeWebhook', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'payment_intent.canceled',
            data: {
                object: {
                    id: 'pi_789',
                    status: 'canceled',
                    amount_received: 0,
                },
            },
        })
        mockPaymentService.handleStripeWebhook.mockResolvedValue(undefined)

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockPaymentService.handleStripeWebhook).toHaveBeenCalledWith('pi_789', 'canceled', 0)
    })

    it('handles charge.dispute.created and cancels the associated order via orderService', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'charge.dispute.created',
            data: {
                object: {
                    id: 'dp_123',
                    payment_intent: 'pi_dispute',
                },
            },
        })
        mockOrderRepository.findByStripePaymentIntentId.mockResolvedValue({ id: 'order-1' })
        mockOrderService.cancel.mockResolvedValue(undefined)

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockOrderRepository.findByStripePaymentIntentId).toHaveBeenCalledWith('pi_dispute')
        expect(mockOrderService.cancel).toHaveBeenCalledWith('order-1')
    })

    it('handles charge.dispute.created gracefully when no order is found', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'charge.dispute.created',
            data: {
                object: {
                    id: 'dp_123',
                    payment_intent: 'pi_no_order',
                },
            },
        })
        mockOrderRepository.findByStripePaymentIntentId.mockResolvedValue(null)

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockOrderService.cancel).not.toHaveBeenCalled()
    })

    it('returns 200 and does nothing for unknown event types', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'customer.created',
            data: { object: { id: 'cus_123' } },
        })

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockPaymentService.handleCheckoutCompleted).not.toHaveBeenCalled()
        expect(mockPaymentService.handleStripeWebhook).not.toHaveBeenCalled()
    })

    it('returns 500 when the event handler throws', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_fail' } },
        })
        mockPaymentService.handleCheckoutCompleted.mockRejectedValue(new Error('DB error'))

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(500)
        expect(json.error).toMatch(/Webhook handler failed/i)
    })

    it('does not call handleStripeWebhook when stripe status is unmapped', async () => {
        mockStripe.webhooks.constructEvent.mockReturnValue({
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_unknown',
                    status: 'unknown_status',
                    amount_received: 0,
                },
            },
        })

        const res = await POST(makeRequest('{}'))
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.received).toBe(true)
        expect(mockPaymentService.handleStripeWebhook).not.toHaveBeenCalled()
    })
})
