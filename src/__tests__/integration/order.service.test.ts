import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestError, NotFoundError, ForbiddenError } from '@/utils/errors'

vi.mock('@/lib/stripe', () => ({
    stripe: {
        paymentIntents: {
            cancel: vi.fn(),
        },
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

const mockOrderRepo = orderRepository as any
const mockCartRepo = cartRepository as any
const mockProductRepo = productRepository as any

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
        const order = { id: 'ord-1', userId: 'user-1', status: 'pending', paymentStatus: 'requires_payment_method' }
        mockOrderRepo.findById.mockResolvedValue(order)
        mockOrderRepo.update.mockResolvedValue({ ...order, ...validAddress })

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
