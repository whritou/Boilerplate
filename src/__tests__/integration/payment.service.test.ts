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
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    items: [
        { productId: 'prod-1', quantity: 2, price: 14.995, product: { name: 'Widget', imageUrl: null } },
    ],
}

beforeEach(() => {
    vi.clearAllMocks()
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
})

describe('PaymentService.syncPaymentStatus', () => {
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
        mockPaymentRepo.create.mockResolvedValue({})

        const result = await paymentService.syncPaymentStatus('ord-1')
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'succeeded')
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'confirmed')
    })
})
