import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestError, NotFoundError } from '@/utils/errors'

vi.mock('@/repositories/order.repository', () => ({
    orderRepository: {
        findMany: vi.fn(),
        findById: vi.fn(),
        findWithDetails: vi.fn(),
        findByUserId: vi.fn(),
        findByStripePaymentIntentId: vi.fn(),
        createWithItems: vi.fn(),
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
    it('cancels a pending order and restores stock', async () => {
        const order = {
            id: 'ord-1',
            status: 'pending',
            items: [{ productId: 'prod-1', quantity: 2 }],
        }
        mockOrderRepo.findWithDetails.mockResolvedValue(order)
        mockProductRepo.findById.mockResolvedValue(sampleProduct)
        mockProductRepo.updateStock.mockResolvedValue({})
        mockOrderRepo.updateStatus.mockResolvedValue({ ...order, status: 'canceled' })

        const result = await orderService.cancel('ord-1')
        expect(result.status).toBe('canceled')
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
