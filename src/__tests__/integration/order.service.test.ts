import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors'

vi.mock('@/lib/stripe', () => ({
    stripe: {
        paymentIntents: {
            cancel: vi.fn(),
        },
        refunds: {
            create: vi.fn(),
            list: vi.fn(),
        },
    },
}))

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        $transaction: vi.fn(),
        order: { update: vi.fn() },
        payment: { update: vi.fn() },
        user: { findUnique: vi.fn() },
    },
}))

vi.mock('@/repositories/payment.repository', () => ({
    paymentRepository: {
        findByStripePaymentIntentId: vi.fn(),
        updateStatus: vi.fn(),
    },
}))

vi.mock('@/services/mail.service', () => ({
    mailService: {
        sendOrderRefundEmail: vi.fn(),
    },
}))

vi.mock('@/repositories/order.repository', () => ({
    orderRepository: {
        findMany: vi.fn(),
        findById: vi.fn(),
        findWithDetails: vi.fn(),
        findByUserId: vi.fn(),
        findByStripePaymentIntentId: vi.fn(),
        findExpiredUnpaid: vi.fn(),
        createWithItems: vi.fn(),
        update: vi.fn(),
        updateStatus: vi.fn(),
        updatePaymentStatus: vi.fn(),
    },
}))

vi.mock('@/repositories/cart.repository', () => ({
    cartRepository: {
        findByUserId: vi.fn(),
        clearItems: vi.fn(),
    },
}))

vi.mock('@/repositories/product.repository', () => ({
    productRepository: {
        findById: vi.fn(),
        decrementStock: vi.fn(),
        incrementStock: vi.fn(),
        updateStock: vi.fn(),
    },
}))

import { orderService } from '@/services/order.service'
import { orderRepository } from '@/repositories/order.repository'
import { cartRepository } from '@/repositories/cart.repository'
import { productRepository } from '@/repositories/product.repository'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { mailService } from '@/services/mail.service'

const mockOrderRepo = orderRepository as any
const mockCartRepo = cartRepository as any
const mockProductRepo = productRepository as any
const mockStripe = stripe as any
const mockPrisma = prisma as any
const mockMail = mailService as any

const sampleProduct = {
    id: 'prod-1',
    name: 'Widget',
    price: 10,
    quantity: 50,
    isArchived: false,
    deletedAt: null,
}

const sampleCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [
        { id: 'ci-1', productId: 'prod-1', quantity: 2, price: 10 },
    ],
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('OrderService.createFromCart', () => {
    it('creates order from cart and decrements stock', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(sampleCart)
        mockProductRepo.findById.mockResolvedValue(sampleProduct)
        mockOrderRepo.createWithItems.mockResolvedValue({ id: 'ord-1', items: sampleCart.items })
        mockProductRepo.decrementStock.mockResolvedValue({})
        mockCartRepo.clearItems.mockResolvedValue({})

        const result = await orderService.createFromCart('user-1')
        expect(result.id).toBe('ord-1')
        expect(mockProductRepo.decrementStock).toHaveBeenCalledWith('prod-1', 2)
        expect(mockCartRepo.clearItems).toHaveBeenCalledWith('cart-1')

        expect(mockOrderRepo.createWithItems).toHaveBeenCalledWith(
            expect.objectContaining({ expiresAt: expect.any(Date) }),
        )
    })

    it('throws BadRequestError when cart is empty', async () => {
        mockCartRepo.findByUserId.mockResolvedValue({ ...sampleCart, items: [] })
        await expect(orderService.createFromCart('user-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when cart is null', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(null)
        await expect(orderService.createFromCart('user-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when product has insufficient stock', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(sampleCart)
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, quantity: 1 })
        await expect(orderService.createFromCart('user-1')).rejects.toThrow(BadRequestError)
    })

    it('throws NotFoundError when product is not found', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(sampleCart)
        mockProductRepo.findById.mockResolvedValue(null)
        await expect(orderService.createFromCart('user-1')).rejects.toThrow(NotFoundError)
    })

    it('throws BadRequestError when product is archived', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(sampleCart)
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, isArchived: true })
        await expect(orderService.createFromCart('user-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when product is soft-deleted', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(sampleCart)
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, deletedAt: new Date() })
        await expect(orderService.createFromCart('user-1')).rejects.toThrow(BadRequestError)
    })
})

describe('OrderService.cancel', () => {
    it('cancels a pending order and restores stock atomically', async () => {
        const order = {
            id: 'ord-1',
            status: 'pending',
            stripePaymentIntentId: null,
            items: [{ productId: 'prod-1', quantity: 2 }],
        }
        mockOrderRepo.findWithDetails.mockResolvedValue(order)
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({ ...order, status: 'canceled' })

        const result = await orderService.cancel('ord-1')
        expect(result.status).toBe('canceled')
        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-1', 2)
    })

    it('throws BadRequestError for shipped orders', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({ id: 'ord-1', status: 'shipped', items: [] })
        await expect(orderService.cancel('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(null)
        await expect(orderService.cancel('missing')).rejects.toThrow(NotFoundError)
    })
})

describe('OrderService.getById - basic paths', () => {
    it('throws NotFoundError when order does not exist', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(null)
        await expect(orderService.getById('missing')).rejects.toThrow(NotFoundError)
    })

    it('returns order directly when not expired', async () => {
        const order = {
            id: 'ord-1',
            status: 'confirmed',
            paymentStatus: 'succeeded',
            expiresAt: new Date(Date.now() + 60000),
            items: [],
        }
        mockOrderRepo.findWithDetails.mockResolvedValue(order)

        const result = await orderService.getById('ord-1')
        expect(result).toBe(order)
    })

    it('returns order directly when expiresAt is null (no expiry)', async () => {
        const order = {
            id: 'ord-1',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
            expiresAt: null,
            items: [],
        }
        mockOrderRepo.findWithDetails.mockResolvedValue(order)

        const result = await orderService.getById('ord-1')
        expect(result).toBe(order)
    })
})

describe('OrderService.getById', () => {
    it('auto-cancels expired orders', async () => {
        const expiredOrder = {
            id: 'ord-expired',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
            stripePaymentIntentId: null,
            expiresAt: new Date(Date.now() - 60000),
            items: [{ productId: 'prod-1', quantity: 1 }],
        }
        const canceledOrder = { ...expiredOrder, status: 'canceled', paymentStatus: 'canceled' }

        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(expiredOrder)
            .mockResolvedValueOnce(expiredOrder)
            .mockResolvedValueOnce(canceledOrder)

        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        const result = await orderService.getById('ord-expired')
        expect(result.status).toBe('canceled')
        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-1', 1)
    })
})

describe('OrderService.updateShippingAddress', () => {
    const validAddress = {
        shippingFirstName: 'John',
        shippingLastName: 'Doe',
        shippingStreet: '123 Main St',
        shippingCity: 'Paris',
        shippingZipCode: '75001',
        shippingCountry: 'France',
    }

    it('updates address on a pending order owned by user', async () => {
        const order = {
            id: 'ord-1',
            userId: 'user-1',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
        }

        mockOrderRepo.findById.mockResolvedValue(order)
        mockOrderRepo.update.mockResolvedValue({ ...order, ...validAddress })
        mockOrderRepo.findWithDetails.mockResolvedValue({
            ...order,
            ...validAddress,
        })

        const result = await orderService.updateShippingAddress('ord-1', 'user-1', validAddress)

        expect(result!.shippingFirstName).toBe('John')
        expect(mockOrderRepo.update).toHaveBeenCalledWith('ord-1', validAddress)
    })

    it('throws NotFoundError when order does not exist', async () => {
        mockOrderRepo.findById.mockResolvedValue(null)
        await expect(orderService.updateShippingAddress('missing', 'user-1', validAddress)).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when user does not own the order', async () => {
        mockOrderRepo.findById.mockResolvedValue({ id: 'ord-1', userId: 'user-2', status: 'pending', paymentStatus: 'requires_payment_method' })
        await expect(orderService.updateShippingAddress('ord-1', 'user-1', validAddress)).rejects.toThrow(ForbiddenError)
    })

    it('throws BadRequestError when order is not pending', async () => {
        mockOrderRepo.findById.mockResolvedValue({ id: 'ord-1', userId: 'user-1', status: 'confirmed', paymentStatus: 'succeeded' })
        await expect(orderService.updateShippingAddress('ord-1', 'user-1', validAddress)).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when order is already paid', async () => {
        mockOrderRepo.findById.mockResolvedValue({ id: 'ord-1', userId: 'user-1', status: 'pending', paymentStatus: 'succeeded' })
        await expect(orderService.updateShippingAddress('ord-1', 'user-1', validAddress)).rejects.toThrow(BadRequestError)
    })
})

describe('OrderService.getAll', () => {
    it('delegates to orderRepository.findMany', async () => {
        const paginated = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }
        mockOrderRepo.findMany.mockResolvedValue(paginated)

        const result = await orderService.getAll({})
        expect(mockOrderRepo.findMany).toHaveBeenCalledWith({})
        expect(result).toBe(paginated)
    })

    it('auto-expires expired orders in the result set and patches them in-memory', async () => {
        const expiredOrder = {
            id: 'ord-expired',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
            expiresAt: new Date(Date.now() - 60_000), // expired 1 minute ago
            stripePaymentIntentId: null,
            items: [{ productId: 'prod-1', quantity: 2 }],
        }
        const meta = { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

        mockOrderRepo.findMany.mockResolvedValue({ data: [expiredOrder], meta })
        mockOrderRepo.findWithDetails.mockResolvedValue(expiredOrder)
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        const result = await orderService.getAll({})

        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-expired', 'expired')
        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-1', 2)
        // No second findMany — statuses are patched directly on the in-memory object
        expect(mockOrderRepo.findMany).toHaveBeenCalledTimes(1)
        expect(result.data[0].status).toBe('expired')
        expect(result.data[0].paymentStatus).toBe('canceled')
    })

    it('does not make extra DB calls when no orders are expired', async () => {
        const activeOrder = {
            id: 'ord-1',
            status: 'confirmed',
            paymentStatus: 'succeeded',
            expiresAt: null,
            items: [],
        }
        const paginated = { data: [activeOrder], meta: { total: 1, page: 1, limit: 20 } }
        mockOrderRepo.findMany.mockResolvedValue(paginated)

        const result = await orderService.getAll({})

        expect(mockOrderRepo.findMany).toHaveBeenCalledTimes(1)
        expect(result).toBe(paginated)
    })
})

describe('OrderService.getByUserId', () => {
    it('delegates to orderRepository.findByUserId', async () => {
        const orders = [{ id: 'ord-1', status: 'confirmed', paymentStatus: 'succeeded', expiresAt: null }]
        mockOrderRepo.findByUserId.mockResolvedValue(orders)

        const result = await orderService.getByUserId('user-1')
        expect(mockOrderRepo.findByUserId).toHaveBeenCalledWith('user-1')
        expect(result).toBe(orders)
    })

    it('auto-expires expired orders and patches them in-memory', async () => {
        const expiredOrder = {
            id: 'ord-expired',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
            expiresAt: new Date(Date.now() - 60_000),
            stripePaymentIntentId: null,
            items: [],
        }

        mockOrderRepo.findByUserId.mockResolvedValue([expiredOrder])
        mockOrderRepo.findWithDetails.mockResolvedValue(expiredOrder)
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        const result = await orderService.getByUserId('user-1')

        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-expired', 'expired')
        // No second findByUserId — statuses are patched directly on the in-memory object
        expect(mockOrderRepo.findByUserId).toHaveBeenCalledTimes(1)
        expect(result[0].status).toBe('expired')
        expect(result[0].paymentStatus).toBe('canceled')
    })
})

describe('OrderService.updateStatus', () => {
    it('calls orderRepository.updateStatus and returns order', async () => {
        const updated = { id: 'ord-1', status: 'confirmed' }
        mockOrderRepo.updateStatus.mockResolvedValue(updated)

        const result = await orderService.updateStatus('ord-1', 'confirmed')
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'confirmed')
        expect(result).toBe(updated)
    })

    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.updateStatus.mockResolvedValue(null)
        await expect(orderService.updateStatus('missing', 'confirmed')).rejects.toThrow(NotFoundError)
    })
})

describe('OrderService.updatePaymentStatus', () => {
    it('calls orderRepository.updatePaymentStatus and returns order', async () => {
        const updated = { id: 'ord-1', paymentStatus: 'succeeded' }
        mockOrderRepo.updatePaymentStatus.mockResolvedValue(updated)

        const result = await orderService.updatePaymentStatus('ord-1', 'succeeded')
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'succeeded')
        expect(result).toBe(updated)
    })

    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.updatePaymentStatus.mockResolvedValue(null)
        await expect(orderService.updatePaymentStatus('missing', 'succeeded')).rejects.toThrow(NotFoundError)
    })
})

describe('OrderService.cancel - with Stripe PI', () => {
    const orderWithPI = {
        id: 'ord-1',
        status: 'pending',
        stripePaymentIntentId: 'pi_abc123',
        items: [{ productId: 'prod-1', quantity: 1 }],
    }

    it('cancels stripe payment intent when order has one', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(orderWithPI)
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockStripe.paymentIntents.cancel.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({ ...orderWithPI, status: 'canceled' })

        await orderService.cancel('ord-1')

        expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_abc123')
    })

    it('continues when stripe cancel throws (logs error)', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(orderWithPI)
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockStripe.paymentIntents.cancel.mockRejectedValue(new Error('already canceled'))
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({ ...orderWithPI, status: 'canceled' })

        // Should not throw even though Stripe errors
        const result = await orderService.cancel('ord-1')
        expect(result.status).toBe('canceled')
    })
})

describe('OrderService.cancelExpired', () => {
    it('does nothing when order not found (returns early)', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(null)

        await orderService.cancelExpired('missing')

        expect(mockProductRepo.incrementStock).not.toHaveBeenCalled()
        expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled()
    })

    it('does nothing when order is not pending', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({
            id: 'ord-1',
            status: 'confirmed',
            paymentStatus: 'succeeded',
            stripePaymentIntentId: null,
            items: [],
        })

        await orderService.cancelExpired('ord-1')

        expect(mockProductRepo.incrementStock).not.toHaveBeenCalled()
        expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled()
    })

    it('does nothing when order is succeeded', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({
            id: 'ord-1',
            status: 'pending',
            paymentStatus: 'succeeded',
            stripePaymentIntentId: null,
            items: [],
        })

        await orderService.cancelExpired('ord-1')

        expect(mockProductRepo.incrementStock).not.toHaveBeenCalled()
        expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled()
    })

    it('cancels stripe PI when present and handles error gracefully', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({
            id: 'ord-1',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
            stripePaymentIntentId: 'pi_xyz',
            items: [{ productId: 'prod-1', quantity: 2 }],
        })
        mockStripe.paymentIntents.cancel.mockRejectedValue(new Error('stripe error'))
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        // Should not throw
        await orderService.cancelExpired('ord-1')

        expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_xyz')
        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-1', 2)
    })

    it('restores stock and updates statuses', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({
            id: 'ord-1',
            status: 'pending',
            paymentStatus: 'requires_payment_method',
            stripePaymentIntentId: null,
            items: [
                { productId: 'prod-1', quantity: 3 },
                { productId: 'prod-2', quantity: 1 },
            ],
        })
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        await orderService.cancelExpired('ord-1')

        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-1', 3)
        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-2', 1)
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ord-1', 'expired')
        expect(mockOrderRepo.updatePaymentStatus).toHaveBeenCalledWith('ord-1', 'canceled')
    })
})

describe('OrderService.cancelAllExpired', () => {
    it('finds and cancels all expired orders', async () => {
        const expiredOrders = [
            { id: 'ord-1', status: 'pending', paymentStatus: 'requires_payment_method', stripePaymentIntentId: null, items: [] },
            { id: 'ord-2', status: 'pending', paymentStatus: 'requires_payment_method', stripePaymentIntentId: null, items: [] },
        ]
        mockOrderRepo.findExpiredUnpaid.mockResolvedValue(expiredOrders)
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(expiredOrders[0])
            .mockResolvedValueOnce(expiredOrders[1])
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        await orderService.cancelAllExpired()

        expect(mockOrderRepo.findExpiredUnpaid).toHaveBeenCalled()
        expect(mockOrderRepo.updateStatus).toHaveBeenCalledTimes(2)
    })

    it('returns count of canceled orders', async () => {
        const expiredOrders = [
            { id: 'ord-1', status: 'pending', paymentStatus: 'requires_payment_method', stripePaymentIntentId: null, items: [] },
            { id: 'ord-2', status: 'pending', paymentStatus: 'requires_payment_method', stripePaymentIntentId: null, items: [] },
            { id: 'ord-3', status: 'pending', paymentStatus: 'requires_payment_method', stripePaymentIntentId: null, items: [] },
        ]
        mockOrderRepo.findExpiredUnpaid.mockResolvedValue(expiredOrders)
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(expiredOrders[0])
            .mockResolvedValueOnce(expiredOrders[1])
            .mockResolvedValueOnce(expiredOrders[2])
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({})
        mockOrderRepo.updatePaymentStatus.mockResolvedValue({})

        const count = await orderService.cancelAllExpired()

        expect(count).toBe(3)
    })
})

describe('OrderService.cancelAndRefund', () => {
    const paidOrder = {
        id: 'ord-1',
        userId: 'user-1',
        totalPrice: 29.99,
        status: 'confirmed',
        paymentStatus: 'succeeded',
        stripePaymentIntentId: 'pi_123',
        items: [{ productId: 'prod-1', quantity: 2 }],
    }

    it('refunds a paid order, updates DB, restores stock, sends email', async () => {
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(paidOrder)
            .mockResolvedValueOnce({ ...paidOrder, status: 'canceled', paymentStatus: 'refunded' })
        mockStripe.refunds.list.mockResolvedValue({ data: [] })
        mockStripe.refunds.create.mockResolvedValue({ id: 're_123' })
        mockPrisma.$transaction.mockResolvedValue([{}, {}])
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'john@example.com' })
        mockMail.sendOrderRefundEmail.mockResolvedValue(undefined)

        const result = await orderService.cancelAndRefund('ord-1')

        expect(result!.status).toBe('canceled')
        expect(mockStripe.refunds.create).toHaveBeenCalledWith(
            { payment_intent: 'pi_123', reason: 'requested_by_customer' },
            { idempotencyKey: 'refund-ord-1' },
        )
        expect(mockPrisma.$transaction).toHaveBeenCalled()
        expect(mockProductRepo.incrementStock).toHaveBeenCalledWith('prod-1', 2)
        expect(mockMail.sendOrderRefundEmail).toHaveBeenCalledWith('john@example.com', 'ord-1', '29.99')
    })

    it('throws NotFoundError when order not found', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(null)
        await expect(orderService.cancelAndRefund('missing')).rejects.toThrow(NotFoundError)
    })

    it('throws BadRequestError when order is already canceled', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({ ...paidOrder, status: 'canceled' })
        await expect(orderService.cancelAndRefund('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when order is already refunded', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({ ...paidOrder, paymentStatus: 'refunded' })
        await expect(orderService.cancelAndRefund('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when order has not been paid', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({ ...paidOrder, paymentStatus: 'requires_payment_method' })
        await expect(orderService.cancelAndRefund('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when order has no stripePaymentIntentId', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue({ ...paidOrder, stripePaymentIntentId: null })
        await expect(orderService.cancelAndRefund('ord-1')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when partial refund exists on Stripe', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(paidOrder)
        mockStripe.refunds.list.mockResolvedValue({ data: [{ id: 're_partial' }] })

        await expect(orderService.cancelAndRefund('ord-1')).rejects.toThrow('partial refund already exists')
    })

    it('throws BadRequestError when Stripe refund fails', async () => {
        mockOrderRepo.findWithDetails.mockResolvedValue(paidOrder)
        mockStripe.refunds.list.mockResolvedValue({ data: [] })
        mockStripe.refunds.create.mockRejectedValue(new Error('charge_already_refunded'))

        await expect(orderService.cancelAndRefund('ord-1')).rejects.toThrow('Refund failed')
        expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('continues if email sending fails', async () => {
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(paidOrder)
            .mockResolvedValueOnce({ ...paidOrder, status: 'canceled', paymentStatus: 'refunded' })
        mockStripe.refunds.list.mockResolvedValue({ data: [] })
        mockStripe.refunds.create.mockResolvedValue({ id: 're_123' })
        mockPrisma.$transaction.mockResolvedValue([{}, {}])
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'john@example.com' })
        mockMail.sendOrderRefundEmail.mockRejectedValue(new Error('SMTP down'))

        const result = await orderService.cancelAndRefund('ord-1')
        expect(result!.status).toBe('canceled')
    })

    it('skips email when user has no email address', async () => {
        mockOrderRepo.findWithDetails
            .mockResolvedValueOnce(paidOrder)
            .mockResolvedValueOnce({ ...paidOrder, status: 'canceled', paymentStatus: 'refunded' })
        mockStripe.refunds.list.mockResolvedValue({ data: [] })
        mockStripe.refunds.create.mockResolvedValue({ id: 're_123' })
        mockPrisma.$transaction.mockResolvedValue([{}, {}])
        mockProductRepo.incrementStock.mockResolvedValue({})
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: null })

        const result = await orderService.cancelAndRefund('ord-1')
        expect(result!.status).toBe('canceled')
        expect(mockMail.sendOrderRefundEmail).not.toHaveBeenCalled()
    })
})
