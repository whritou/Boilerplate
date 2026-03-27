import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        cart: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            count: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
        },
        cartItem: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
    },
}))

import { cartRepository } from '@/repositories/cart.repository'
import { prisma } from '@/lib/db/prisma'

const mockPrisma = prisma as any

const sampleCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [],
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('CartRepository (base methods)', () => {
    it('findMany delegates to model.findMany and count', async () => {
        mockPrisma.cart.findMany.mockResolvedValue([])
        mockPrisma.cart.count.mockResolvedValue(0)

        const result = await cartRepository.findMany({})
        expect(mockPrisma.cart.findMany).toHaveBeenCalled()
        expect(result.data).toEqual([])
    })

    it('findById delegates to model.findUnique', async () => {
        mockPrisma.cart.findUnique.mockResolvedValue(sampleCart)
        const result = await cartRepository.findById('cart-1')
        expect(result).toEqual(sampleCart)
    })
})

describe('CartRepository.findWithItems', () => {
    it('finds cart with items by id', async () => {
        const cartWithItems = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2, product: {} }] }
        mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems)

        const result = await cartRepository.findWithItems('cart-1')

        expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'cart-1' },
                include: expect.objectContaining({ items: expect.anything() }),
            }),
        )
        expect(result).toEqual(cartWithItems)
    })
})

describe('CartRepository.findByUserId', () => {
    it('finds cart by userId with items', async () => {
        mockPrisma.cart.findUnique.mockResolvedValue(sampleCart)

        const result = await cartRepository.findByUserId('user-1')

        expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1' },
                include: expect.objectContaining({ items: expect.anything() }),
            }),
        )
        expect(result).toEqual(sampleCart)
    })

    it('returns null when cart not found', async () => {
        mockPrisma.cart.findUnique.mockResolvedValue(null)
        const result = await cartRepository.findByUserId('user-none')
        expect(result).toBeNull()
    })
})

describe('CartRepository.addItem', () => {
    it('increments quantity when item already exists', async () => {
        const existing = { id: 'ci-1', cartId: 'cart-1', productId: 'prod-1', quantity: 2 }
        mockPrisma.cartItem.findFirst.mockResolvedValue(existing)
        mockPrisma.cartItem.update.mockResolvedValue({ ...existing, quantity: 5 })

        const result = await cartRepository.addItem('cart-1', 'prod-1', 3, 10)

        expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'ci-1' },
                data: { quantity: 5 },
            }),
        )
        expect(result).toEqual(expect.objectContaining({ quantity: 5 }))
    })

    it('creates new item when not exists', async () => {
        mockPrisma.cartItem.findFirst.mockResolvedValue(null)
        mockPrisma.cartItem.create.mockResolvedValue({ id: 'ci-new', cartId: 'cart-1', productId: 'prod-2', quantity: 1, price: 9.99 })

        const result = await cartRepository.addItem('cart-1', 'prod-2', 1, 9.99)

        expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { cartId: 'cart-1', productId: 'prod-2', quantity: 1, price: 9.99 },
            }),
        )
        expect(result).toEqual(expect.objectContaining({ productId: 'prod-2' }))
    })
})

describe('CartRepository.updateItemQuantity', () => {
    it('updates item quantity', async () => {
        mockPrisma.cartItem.update.mockResolvedValue({ id: 'ci-1', quantity: 7 })

        const result = await cartRepository.updateItemQuantity('ci-1', 7)

        expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'ci-1' },
                data: { quantity: 7 },
            }),
        )
        expect(result).toEqual(expect.objectContaining({ quantity: 7 }))
    })
})

describe('CartRepository.removeItem', () => {
    it('deletes the cart item', async () => {
        mockPrisma.cartItem.delete.mockResolvedValue({ id: 'ci-1' })

        await cartRepository.removeItem('ci-1')

        expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-1' } })
    })
})

describe('CartRepository.clearItems', () => {
    it('deletes all items for a cart', async () => {
        mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 3 })

        await cartRepository.clearItems('cart-1')

        expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } })
    })
})

describe('CartRepository.getOrCreate', () => {
    it('returns existing cart when found', async () => {
        mockPrisma.cart.findUnique.mockResolvedValue(sampleCart)

        const result = await cartRepository.getOrCreate('user-1')

        expect(mockPrisma.cart.create).not.toHaveBeenCalled()
        expect(result).toEqual(sampleCart)
    })

    it('creates cart when not found', async () => {
        const newCart = { id: 'cart-new', userId: 'user-new', items: [] }
        mockPrisma.cart.findUnique.mockResolvedValue(null)
        mockPrisma.cart.create.mockResolvedValue(newCart)

        const result = await cartRepository.getOrCreate('user-new')

        expect(mockPrisma.cart.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { userId: 'user-new' },
            }),
        )
        expect(result).toEqual(newCart)
    })
})
