import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, BadRequestError } from '@/utils/errors'

vi.mock('@/lib/stripe', () => ({
    stripe: {
        paymentIntents: {
            create: vi.fn(),
            retrieve: vi.fn(),
        },
        checkout: {
            sessions: {
                create: vi.fn(),
                retrieve: vi.fn(),
            },
        },
    },
}))

vi.mock('@/repositories/payment.repository', () => ({
    paymentRepository: {
        findById: vi.fn(),
        findOne: vi.fn(),
        findByStripePaymentIntentId: vi.fn(),
        create: vi.fn(),
        updateStatus: vi.fn(),
    },
}))

vi.mock('@/repositories/order.repository', () => ({
    orderRepository: {
        findById: vi.fn(),
        findWithDetails: vi.fn(),
        findByStripePaymentIntentId: vi.fn(),
        update: vi.fn(),
        updateStatus: vi.fn(),
        updatePaymentStatus: vi.fn(),
    },
}))

vi.mock('@/services/order.service', () => ({
    orderService: {
        cancelExpired: vi.fn(),
    },
}))

import { paymentService } from '@/services/payment.service'
import { orderRepository } from '@/repositories/order.repository'
import { paymentRepository } from '@/repositories/payment.repository'
import { stripe } from '@/lib/stripe'

const mockOrderRepo = orderRepository as any
const mockPaymentRepo = paymentRepository as any
const mockStripe = stripe as any

const sampleOrder = {
    id: 'ord-1',
    userId: 'user-1',
    totalPrice: 29.99,
    status: 'pending',
    paymentStatus: 'requires_payment_method',
    stripePaymentIntentId: null,
    shippingFirstName: 'John',
    shippingLastName: 'Doe',
    shippingStreet: '123 Main St',
    shippingCity: 'Paris',
    shippingZipCode: '75001',
    shippingCountry: 'France',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    items: [
        { productId: 'prod-1', quantity: 2, price: 14.995, product: { name: 'Widget', imageUrl: null } },
    ],
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe('PaymentService.createPaymentIntent', () => {
    it('creates a new payment intent', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(sampleOrder)
        mockStripe.paymentIntents.create.mockResolvedValue({
            id: 'pi_123',
            client_secret: 'cs_123',
        })
        mockOrderRepo.update.mockResolvedValue({})

        const result = await paymentService.createPaymentIntent('ord-1')

        expect(result.clientSecret).toBe('cs_123')
        expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 2999,
                currency: 'eur',
                metadata: { orderId: 'ord-1' },
            }),
            { idempotencyKey: 'create-pi-ord-1' },
        )
        expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', { stripePaymentIntentId: 'pi_123' })
    })

    it('returns existing intent if still active', async () => {
        const orderWithIntent = { ...sampleOrder, stripePaymentIntentId: 'pi_existing' }
        mockOrderRepo.findWithDetails.mockResolvedValue(orderWithIntent)
        mockStripe.paymentIntents.retrieve.mockResolvedValue({
            status: 'requires_payment_method',
            client_secret: 'cs_existing',
        })

        const result = await paymentService.createPaymentIntent('ord-1')

        expect(result.clientSecret).toBe('cs_existing')
        expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(null)
        await expect(paymentService.createPaymentIntent('missing')).rejects.toThrow(NotFoundError)
    })

    it('throws BadRequestError when order is already paid', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({ ...sampleOrder, paymentStatus: 'succeeded' })
        await expect(paymentService.createPaymentIntent('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when shipping address is missing', async () => {
        const noAddress = {
            ...sampleOrder,
            shippingFirstName: null,
            shippingLastName: null,
            shippingStreet: null,
            shippingCity: null,
            shippingZipCode: null,
            shippingCountry: null,
        }
        mockOrderRepo.findWithDetails.mockResolvedValue(noAddress)
        await expect(paymentService.createPaymentIntent('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when order has expired', async () => {
        const expiredOrder = {
            ...sampleOrder,
            expiresAt: new Date(Date.now() - 60000),
        }
        mockOrderRepo.findWithDetails.mockResolvedValue(expiredOrder)

        await expect(paymentService.createPaymentIntent('ord-1')).rejects.toThrow(BadRequestError)
    })
})

describe('PaymentService.handleStripeWebhook', () => {
    it('creates payment for new payment intent', async () => {
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockPaymentRepo.findOne.mockResolvedValue(null)
        mockOrderRepo.findByStripePaymentIntentId.mockResolvedValue(sampleOrder)
        mockOrderRepo.findById.mockResolvedValue(sampleOrder)
        mockPaymentRepo.create.mockResolvedValue({ id: 'pay-1', status: 'succeeded' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.update.mockResolvedValue({})

        const result = await paymentService.handleStripeWebhook('pi_123', 'succeeded', 2999)

        expect(mockPaymentRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stripePaymentIntentId: 'pi_123',
                amount: 29.99,
                status: 'succeeded',
            }),
        )
    })

    it('skips duplicate webhook events (idempotent)', async () => {
        const existingPayment = { id: 'pay-1', status: 'succeeded', orderId: 'ord-1' }
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(existingPayment)

        const result = await paymentService.handleStripeWebhook('pi_123', 'succeeded', 2999)

        expect(result).toEqual(existingPayment)
        expect(mockPaymentRepo.create).not.toHaveBeenCalled()
        expect(mockPaymentRepo.updateStatus).not.toHaveBeenCalled()
    })

    it('updates status when existing payment has different status', async () => {
        const existingPayment = { id: 'pay-1', status: 'processing', orderId: 'ord-1' }
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(existingPayment)
        mockPaymentRepo.updateStatus.mockResolvedValue({ ...existingPayment, status: 'succeeded' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.update.mockResolvedValue({})

        await paymentService.handleStripeWebhook('pi_123', 'succeeded', 2999)

        expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'succeeded')
    })

    it('throws BadRequestError on amount mismatch', async () => {
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockOrderRepo.findByStripePaymentIntentId.mockResolvedValue(sampleOrder)

        await expect(
            paymentService.handleStripeWebhook('pi_123', 'succeeded', 1000),
        ).rejects.toThrow(BadRequestError)
    })

    it('throws NotFoundError when no order for payment intent', async () => {
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockOrderRepo.findByStripePaymentIntentId.mockResolvedValue(null)

        await expect(
            paymentService.handleStripeWebhook('pi_unknown', 'succeeded'),
        ).rejects.toThrow(NotFoundError)
    })

    it('updates existing payment by orderId when no payment record by PI id', async () => {
        // No payment found by PI id, but a payment found by orderId (created by syncPaymentStatus)
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockOrderRepo.findByStripePaymentIntentId.mockResolvedValue(sampleOrder)
        mockPaymentRepo.findOne.mockResolvedValue({ id: 'pay-existing', status: 'processing', orderId: 'ord-1' })
        mockPaymentRepo.updateStatus.mockResolvedValue({ id: 'pay-existing', status: 'succeeded' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.update.mockResolvedValue({})

        await paymentService.handleStripeWebhook('pi_123', 'succeeded', 2999)

        expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-existing', 'succeeded')
    })
})

describe('PaymentService.syncPaymentStatus', () => {
    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(null)

        await expect(paymentService.syncPaymentStatus('missing')).rejects.toThrow(NotFoundError)
    })

    it('returns order unchanged if no stripe intent', async () => {
        const order = { ...sampleOrder, stripePaymentIntentId: null }
        mockOrderRepo.findWithDetails.mockResolvedValue(order)

        const result = await paymentService.syncPaymentStatus('ord-1')
        expect(result).toEqual(order)
    })

    it('returns order unchanged if already succeeded', async () => {
        const order = { ...sampleOrder, paymentStatus: 'succeeded', stripePaymentIntentId: 'pi_123' }
        mockOrderRepo.findWithDetails.mockResolvedValue(order)

        const result = await paymentService.syncPaymentStatus('ord-1')
        expect(result).toEqual(order)
        expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled()
    })

    it('syncs succeeded status from Stripe', async () => {
        const order = { ...sampleOrder, stripePaymentIntentId: 'pi_123' }
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(order)
            .mockResolvedValueOnce({ ...order, paymentStatus: 'succeeded', status: 'confirmed' })

        mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.update.mockResolvedValue({})
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockPaymentRepo.findOne.mockResolvedValue(null)
        mockPaymentRepo.create.mockResolvedValue({})

        const result = await paymentService.syncPaymentStatus('ord-1')
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'succeeded')
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'confirmed')
    })
})

// ---------------------------------------------------------------------------
// PaymentService.getAll
// ---------------------------------------------------------------------------

describe('PaymentService.getAll', () => {
    it('delegates to paymentRepository.findMany', async () => {
        const fakeResult = { data: [{ id: 'pay-1' }], meta: { total: 1 } }
        mockPaymentRepo.findMany = vi.fn().mockResolvedValue(fakeResult)

        const params = { page: 1, limit: 10 }
        const result = await paymentService.getAll(params as any)

        expect(mockPaymentRepo.findMany).toHaveBeenCalledWith(params)
        expect(result).toEqual(fakeResult)
    })
})

// ---------------------------------------------------------------------------
// PaymentService.getById
// ---------------------------------------------------------------------------

describe('PaymentService.getById', () => {
    it('returns payment when found', async () => {
        const fakePayment = { id: 'pay-1', orderId: 'ord-1', status: 'succeeded' }
        mockPaymentRepo.findById.mockResolvedValue(fakePayment)

        const result = await paymentService.getById('pay-1')

        expect(result).toEqual(fakePayment)
        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('pay-1')
    })

    it('throws NotFoundError when not found', async () => {
        mockPaymentRepo.findById.mockResolvedValue(null)

        await expect(paymentService.getById('missing')).rejects.toThrow(NotFoundError)
    })
})

// ---------------------------------------------------------------------------
// PaymentService.createPaymentIntent - existing cancelled intent
// ---------------------------------------------------------------------------

describe('PaymentService.createPaymentIntent - existing cancelled intent', () => {
    it('creates a new intent when existing intent is cancelled', async () => {
        const orderWithIntent = { ...sampleOrder, stripePaymentIntentId: 'pi_cancelled' }
        mockOrderRepo.findWithDetails.mockResolvedValue(orderWithIntent)
        mockStripe.paymentIntents.retrieve.mockResolvedValue({
            status: 'canceled',
            client_secret: 'cs_cancelled',
        })
        mockStripe.paymentIntents.create.mockResolvedValue({
            id: 'pi_new',
            client_secret: 'cs_new',
        })
        mockOrderRepo.update.mockResolvedValue({})

        const result = await paymentService.createPaymentIntent('ord-1')

        expect(result.clientSecret).toBe('cs_new')
        expect(mockStripe.paymentIntents.create).toHaveBeenCalled()
        expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', { stripePaymentIntentId: 'pi_new' })
    })
})

// ---------------------------------------------------------------------------
// PaymentService.createPaymentIntent - order has no expiry
// ---------------------------------------------------------------------------

describe('PaymentService.createPaymentIntent - order has no expiry', () => {
    it('creates intent when expiresAt is null (no expiration check)', async () => {
        const orderNoExpiry = { ...sampleOrder, expiresAt: null }
        mockOrderRepo.findWithDetails.mockResolvedValue(orderNoExpiry)
        mockStripe.paymentIntents.create.mockResolvedValue({
            id: 'pi_123',
            client_secret: 'cs_123',
        })
        mockOrderRepo.update.mockResolvedValue({})

        const result = await paymentService.createPaymentIntent('ord-1')

        expect(result.clientSecret).toBe('cs_123')
        expect(mockStripe.paymentIntents.create).toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// PaymentService.syncPaymentStatus - race condition guard
// ---------------------------------------------------------------------------

describe('PaymentService.syncPaymentStatus - race condition guard', () => {
    it('returns order if status unchanged (same status as existing payment — webhook already processed)', async () => {
        // order.paymentStatus = 'processing', newStatus (from Stripe) = 'succeeded'
        // They differ (so we don't hit line 107), but existingPayment.status = 'succeeded' = newStatus
        // → should hit line 119: return orderRepository.findWithDetails(orderId)
        const order = { ...sampleOrder, stripePaymentIntentId: 'pi_123', paymentStatus: 'processing' }
        const updatedOrder = { ...order, paymentStatus: 'succeeded', status: 'confirmed' }
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(order)
            .mockResolvedValueOnce(updatedOrder)
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValueOnce({ id: 'pay-1', status: 'succeeded', orderId: 'ord-1' })

        const result = await paymentService.syncPaymentStatus('ord-1')

        expect(mockOrderRepo.updatePaymentStatus).not.toHaveBeenCalled()
        expect(result).toEqual(updatedOrder)
    })

    it('updates payment when existing payment has different status', async () => {
        const order = { ...sampleOrder, stripePaymentIntentId: 'pi_123', paymentStatus: 'processing' }
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(order)
            .mockResolvedValueOnce({ ...order, paymentStatus: 'succeeded', status: 'confirmed' })
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'succeeded' })
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValueOnce({ id: 'pay-1', status: 'processing', orderId: 'ord-1' })
        mockPaymentRepo.updateStatus.mockResolvedValueOnce({ id: 'pay-1', status: 'succeeded' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValueOnce({})
        mockOrderRepo.updateStatus.mockResolvedValueOnce({})
        mockOrderRepo.update.mockResolvedValueOnce({})

        await paymentService.syncPaymentStatus('ord-1')

        expect(mockPaymentRepo.updateStatus).toHaveBeenCalledWith('pay-1', 'succeeded')
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'succeeded')
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'confirmed')
    })

    it('creates payment record for new processing status', async () => {
        const order = { ...sampleOrder, stripePaymentIntentId: 'pi_123', paymentStatus: 'requires_payment_method', totalPrice: 29.99 }
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(order)
            .mockResolvedValueOnce({ ...order, paymentStatus: 'processing' })
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'processing' })
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValueOnce(null)
        mockPaymentRepo.findOne.mockResolvedValueOnce(null)
        mockOrderRepo.updatePaymentStatus.mockResolvedValueOnce({})
        mockPaymentRepo.create.mockResolvedValueOnce({ id: 'pay-new', status: 'processing' })

        await paymentService.syncPaymentStatus('ord-1')

        expect(mockPaymentRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stripePaymentIntentId: 'pi_123',
                status: 'processing',
            }),
        )
    })

    it('returns order unchanged when Stripe status is unknown/unmapped', async () => {
        const order = { ...sampleOrder, stripePaymentIntentId: 'pi_123', paymentStatus: 'requires_payment_method' }
        mockOrderRepo.findWithDetails.mockResolvedValueOnce(order)
        mockStripe.paymentIntents.retrieve.mockResolvedValueOnce({ status: 'unknown_status_xyz' })

        const result = await paymentService.syncPaymentStatus('ord-1')

        expect(mockOrderRepo.updatePaymentStatus).not.toHaveBeenCalled()
        expect(result).toEqual(order)
    })

    it('handles canceled status (sets order to canceled)', async () => {
        const order = { ...sampleOrder, stripePaymentIntentId: 'pi_123', paymentStatus: 'requires_payment_method' }
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(order)
            .mockResolvedValueOnce({ ...order, paymentStatus: 'canceled', status: 'canceled' })
        mockStripe.paymentIntents.retrieve.mockResolvedValue({ status: 'canceled' })
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockPaymentRepo.findOne.mockResolvedValue(null)
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})

        await paymentService.syncPaymentStatus('ord-1')

        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'canceled')
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'canceled')
    })
})

// ---------------------------------------------------------------------------
// PaymentService.createCheckoutSession
// ---------------------------------------------------------------------------

describe('PaymentService.createCheckoutSession', () => {
    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValueOnce(null)

        await expect(
            paymentService.createCheckoutSession('missing', 'https://example.com/success', 'https://example.com/cancel'),
        ).rejects.toThrow(NotFoundError)
    })

    it('throws BadRequestError when already paid', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValueOnce({ ...sampleOrder, paymentStatus: 'succeeded' })

        await expect(
            paymentService.createCheckoutSession('ord-1', 'https://example.com/success', 'https://example.com/cancel'),
        ).rejects.toThrow(BadRequestError)
    })

    it('creates checkout session with line items', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(sampleOrder)
        mockStripe.checkout.sessions.create.mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/cs_test_123',
            payment_intent: null,
        })

        const result = await paymentService.createCheckoutSession(
            'ord-1',
            'https://example.com/success',
            'https://example.com/cancel',
        )

        expect(result.sessionId).toBe('cs_test_123')
        expect(result.url).toBe('https://checkout.stripe.com/cs_test_123')
        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'payment',
                metadata: { orderId: 'ord-1' },
                line_items: expect.arrayContaining([
                    expect.objectContaining({
                        quantity: 2,
                        price_data: expect.objectContaining({
                            currency: 'eur',
                            product_data: expect.objectContaining({ name: 'Widget' }),
                        }),
                    }),
                ]),
            }),
        )
    })

    it('stores stripePaymentIntentId when session has payment_intent', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(sampleOrder)
        mockStripe.checkout.sessions.create.mockResolvedValue({
            id: 'cs_test_456',
            url: 'https://checkout.stripe.com/cs_test_456',
            payment_intent: 'pi_from_session',
        })
        mockOrderRepo.update.mockResolvedValue({})

        await paymentService.createCheckoutSession(
            'ord-1',
            'https://example.com/success',
            'https://example.com/cancel',
        )

        expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', { stripePaymentIntentId: 'pi_from_session' })
    })
})

// ---------------------------------------------------------------------------
// PaymentService.create
// ---------------------------------------------------------------------------

describe('PaymentService.create', () => {
    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.findById.mockResolvedValue(null)

        await expect(
            paymentService.create({ orderId: 'missing', stripePaymentIntentId: 'pi_123', amount: 29.99, status: 'succeeded' }),
        ).rejects.toThrow(NotFoundError)
    })

    it('creates payment and updates order status', async () => {
        mockOrderRepo.findById.mockResolvedValue(sampleOrder)
        mockPaymentRepo.create.mockResolvedValue({ id: 'pay-1', status: 'processing' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        const result = await paymentService.create({
            orderId: 'ord-1',
            stripePaymentIntentId: 'pi_123',
            amount: 29.99,
            status: 'processing',
        })

        expect(result).toEqual({ id: 'pay-1', status: 'processing' })
        expect(mockPaymentRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stripePaymentIntentId: 'pi_123',
                amount: 29.99,
                status: 'processing',
            }),
        )
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'processing')
    })

    it('sets status to confirmed when succeeded', async () => {
        mockOrderRepo.findById.mockResolvedValue(sampleOrder)
        mockPaymentRepo.create.mockResolvedValue({ id: 'pay-1', status: 'succeeded' })
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.update.mockResolvedValue({})

        await paymentService.create({
            orderId: 'ord-1',
            stripePaymentIntentId: 'pi_123',
            amount: 29.99,
            status: 'succeeded',
        })

        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'confirmed')
        expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', { expiresAt: null })
    })
})

// ---------------------------------------------------------------------------
// PaymentService.updateStatus
// ---------------------------------------------------------------------------

describe('PaymentService.updateStatus', () => {
    it('throws NotFoundError when payment not found', async () => {
        mockPaymentRepo.updateStatus.mockResolvedValue(null)

        await expect(paymentService.updateStatus('missing', 'succeeded')).rejects.toThrow(NotFoundError)
    })

    it('updates payment and order status', async () => {
        const fakePayment = { id: 'pay-1', orderId: 'ord-1', status: 'succeeded' }
        mockPaymentRepo.updateStatus.mockResolvedValue(fakePayment)
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        const result = await paymentService.updateStatus('pay-1', 'succeeded')

        expect(result).toEqual(fakePayment)
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'succeeded')
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'confirmed')
    })

    it('sets order to canceled when status is canceled', async () => {
        const fakePayment = { id: 'pay-1', orderId: 'ord-1', status: 'canceled' }
        mockPaymentRepo.updateStatus.mockResolvedValue(fakePayment)
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})

        await paymentService.updateStatus('pay-1', 'canceled')

        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'canceled')
    })
})

// ---------------------------------------------------------------------------
// PaymentService.handleCheckoutCompleted
// ---------------------------------------------------------------------------

describe('PaymentService.handleCheckoutCompleted', () => {
    it('throws BadRequestError when orderId missing from session', async () => {
        mockStripe.checkout.sessions.retrieve.mockResolvedValue({
            metadata: {},
            payment_intent: 'pi_123',
        })

        await expect(paymentService.handleCheckoutCompleted('cs_missing')).rejects.toThrow(BadRequestError)
    })

    it('calls handleStripeWebhook with intent and amount', async () => {
        mockStripe.checkout.sessions.retrieve.mockResolvedValue({
            metadata: { orderId: 'ord-1' },
            payment_intent: { id: 'pi_123', status: 'succeeded', amount_received: 2999 },
        })
        mockOrderRepo.update.mockResolvedValue({})
        mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null)
        mockOrderRepo.findByStripePaymentIntentId.mockResolvedValue(sampleOrder)
        mockPaymentRepo.findOne.mockResolvedValue(null)
        mockPaymentRepo.create.mockResolvedValue({ id: 'pay-1', status: 'succeeded' })
        mockOrderRepo.findById.mockResolvedValue(sampleOrder)
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})

        const result = await paymentService.handleCheckoutCompleted('cs_test_123')

        expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', { stripePaymentIntentId: 'pi_123' })
        expect(mockPaymentRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ stripePaymentIntentId: 'pi_123', status: 'succeeded' }),
        )
    })
})
