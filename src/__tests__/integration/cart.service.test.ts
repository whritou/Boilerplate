import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, BadRequestError } from '@/utils/errors'

vi.mock('@/repositories/cart.repository', () => ({
    cartRepository: {
        findMany: vi.fn(),
        findByUserId: vi.fn(),
        findWithItems: vi.fn(),
        getOrCreate: vi.fn(),
        addItem: vi.fn(),
        updateItemQuantity: vi.fn(),
        removeItem: vi.fn(),
        clearItems: vi.fn(),
        hardDelete: vi.fn(),
    },
}))

vi.mock('@/repositories/product.repository', () => ({
    productRepository: {
        findById: vi.fn(),
    },
}))

import { cartService } from '@/services/cart.service'
import { cartRepository } from '@/repositories/cart.repository'
import { productRepository } from '@/repositories/product.repository'

const mockCartRepo = cartRepository as any
const mockProductRepo = productRepository as any

const sampleCart = {
    id: 'cart-1',
    userId: 'user-1',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
}

const sampleProduct = {
    id: 'prod-1',
    name: 'Widget',
    price: 10,
    quantity: 50,
    isArchived: false,
    deletedAt: null,
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('CartService.addItem', () => {
    it('adds item when product exists and has stock', async () => {
        mockProductRepo.findById.mockResolvedValue(sampleProduct)
        mockCartRepo.getOrCreate.mockResolvedValue(sampleCart)
        mockCartRepo.addItem.mockResolvedValue({})
        mockCartRepo.findWithItems.mockResolvedValue({ ...sampleCart, items: [{ id: 'ci-1' }] })

        const result = await cartService.addItem('user-1', 'prod-1', 2)
        expect(result?.items).toHaveLength(1)
        expect(mockCartRepo.addItem).toHaveBeenCalledWith('cart-1', 'prod-1', 2, 10)
    })

    it('throws NotFoundError when product does not exist', async () => {
        mockProductRepo.findById.mockResolvedValue(null)
        await expect(cartService.addItem('user-1', 'missing', 1)).rejects.toThrow(NotFoundError)
    })

    it('throws BadRequestError when product is archived', async () => {
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, isArchived: true })
        await expect(cartService.addItem('user-1', 'prod-1', 1)).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when insufficient stock', async () => {
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, quantity: 1 })
        await expect(cartService.addItem('user-1', 'prod-1', 5)).rejects.toThrow(BadRequestError)
    })
})

describe('CartService.clear', () => {
    it('clears all items', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(sampleCart)
        mockCartRepo.clearItems.mockResolvedValue({})
        mockCartRepo.findWithItems.mockResolvedValue({ ...sampleCart, items: [] })

        const result = await cartService.clear('user-1')
        expect(result?.items).toHaveLength(0)
    })

    it('throws NotFoundError when no cart exists', async () => {
        mockCartRepo.findByUserId.mockResolvedValue(null)
        await expect(cartService.clear('user-1')).rejects.toThrow(NotFoundError)
    })
})
