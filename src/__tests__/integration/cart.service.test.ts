import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, BadRequestError } from '@/utils/errors'

vi.mock('@/repositories/cart.repository', () => ({
    cartRepository: {
        findMany: vi.fn(),
        findByUserId: vi.fn(),
        findWithItems: vi.fn(),
        getOrCreate: vi.fn(),
        addItem: vi.fn(),
        addItemAndReturn: vi.fn(),
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
        mockCartRepo.addItemAndReturn.mockResolvedValue({ ...sampleCart, items: [{ id: 'ci-1' }] })

        const result = await cartService.addItem('user-1', 'prod-1', 2)
        expect(result?.items).toHaveLength(1)
        expect(mockCartRepo.addItemAndReturn).toHaveBeenCalledWith('cart-1', 'prod-1', 2, 10)
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

describe('CartService.getAll', () => {
    it('delegates to cartRepository.findMany', async () => {
        const paginated = { data: [sampleCart], meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false } }
        mockCartRepo.findMany.mockResolvedValue(paginated)

        const result = await cartService.getAll({})
        expect(mockCartRepo.findMany).toHaveBeenCalledWith({})
        expect(result).toBe(paginated)
    })
})

describe('CartService.getById', () => {
    it('returns cart when found', async () => {
        mockCartRepo.findWithItems.mockResolvedValue(sampleCart)
        const result = await cartService.getById('cart-1')
        expect(result).toBe(sampleCart)
        expect(mockCartRepo.findWithItems).toHaveBeenCalledWith('cart-1')
    })

    it('throws NotFoundError when cart not found', async () => {
        mockCartRepo.findWithItems.mockResolvedValue(null)
        await expect(cartService.getById('missing')).rejects.toThrow(NotFoundError)
    })
})

describe('CartService.addItem - deleted product', () => {
    it('throws BadRequestError when product has deletedAt set (soft-deleted)', async () => {
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, deletedAt: new Date() })
        await expect(cartService.addItem('user-1', 'prod-1', 1)).rejects.toThrow(BadRequestError)
    })
})

describe('CartService.getByUserId', () => {
    it('delegates to cartRepository.getOrCreate', async () => {
        mockCartRepo.getOrCreate.mockResolvedValue(sampleCart)
        const result = await cartService.getByUserId('user-1')
        expect(mockCartRepo.getOrCreate).toHaveBeenCalledWith('user-1')
        expect(result).toBe(sampleCart)
    })
})

describe('CartService.updateItemQuantity', () => {
    it('throws NotFoundError when item not in cart', async () => {
        mockCartRepo.getOrCreate.mockResolvedValue({ ...sampleCart, items: [] })
        await expect(cartService.updateItemQuantity('user-1', 'missing-item', 2)).rejects.toThrow(NotFoundError)
    })

    it('removes item when quantity <= 0 (calls removeItem)', async () => {
        const cartWithItem = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2 }] }
        mockCartRepo.getOrCreate.mockResolvedValue(cartWithItem)
        mockCartRepo.removeItem.mockResolvedValue({})
        mockCartRepo.findWithItems.mockResolvedValue({ ...sampleCart, items: [] })

        const result = await cartService.updateItemQuantity('user-1', 'ci-1', 0)
        expect(mockCartRepo.removeItem).toHaveBeenCalledWith('ci-1')
        expect(result?.items).toHaveLength(0)
    })

    it('throws BadRequestError when product not found (null from repo)', async () => {
        const cartWithItem = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2 }] }
        mockCartRepo.getOrCreate.mockResolvedValue(cartWithItem)
        mockProductRepo.findById.mockResolvedValue(null)

        await expect(cartService.updateItemQuantity('user-1', 'ci-1', 3)).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when product quantity < requested', async () => {
        const cartWithItem = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2 }] }
        mockCartRepo.getOrCreate.mockResolvedValue(cartWithItem)
        mockProductRepo.findById.mockResolvedValue({ ...sampleProduct, quantity: 1 })

        await expect(cartService.updateItemQuantity('user-1', 'ci-1', 5)).rejects.toThrow(BadRequestError)
    })

    it('updates quantity when stock is sufficient', async () => {
        const cartWithItem = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2 }] }
        const updatedCart = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 3 }] }
        mockCartRepo.getOrCreate.mockResolvedValue(cartWithItem)
        mockProductRepo.findById.mockResolvedValue(sampleProduct)
        mockCartRepo.updateItemQuantity.mockResolvedValue({})
        mockCartRepo.findWithItems.mockResolvedValue(updatedCart)

        const result = await cartService.updateItemQuantity('user-1', 'ci-1', 3)
        expect(mockCartRepo.updateItemQuantity).toHaveBeenCalledWith('ci-1', 3)
        expect(result?.items[0].quantity).toBe(3)
    })
})

describe('CartService.removeItem', () => {
    it('throws NotFoundError when item not in cart', async () => {
        mockCartRepo.getOrCreate.mockResolvedValue({ ...sampleCart, items: [] })
        await expect(cartService.removeItem('user-1', 'missing-item')).rejects.toThrow(NotFoundError)
    })

    it('removes item when found', async () => {
        const cartWithItem = { ...sampleCart, items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2 }] }
        mockCartRepo.getOrCreate.mockResolvedValue(cartWithItem)
        mockCartRepo.removeItem.mockResolvedValue({})
        mockCartRepo.findWithItems.mockResolvedValue({ ...sampleCart, items: [] })

        const result = await cartService.removeItem('user-1', 'ci-1')
        expect(mockCartRepo.removeItem).toHaveBeenCalledWith('ci-1')
        expect(result?.items).toHaveLength(0)
    })
})

describe('CartService.delete', () => {
    it('deletes successfully (hardDelete returns true)', async () => {
        mockCartRepo.hardDelete.mockResolvedValue(true)
        await expect(cartService.delete('cart-1')).resolves.toBeUndefined()
        expect(mockCartRepo.hardDelete).toHaveBeenCalledWith('cart-1')
    })

    it('throws NotFoundError when hardDelete returns false', async () => {
        mockCartRepo.hardDelete.mockResolvedValue(false)
        await expect(cartService.delete('missing')).rejects.toThrow(NotFoundError)
    })
})
