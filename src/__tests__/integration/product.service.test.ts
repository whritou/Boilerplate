import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ConflictError } from '@/utils/errors'

vi.mock('@/repositories/product.repository', () => ({
    productRepository: {
        findMany: vi.fn(),
        findById: vi.fn(),
        findByName: vi.fn(),
        findWithFullDetails: vi.fn(),
        findAvailable: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
        archive: vi.fn(),
        unarchive: vi.fn(),
        updateStock: vi.fn(),
        decrementStock: vi.fn(),
    },
}))

import { productService } from '@/services/product.service'
import { productRepository } from '@/repositories/product.repository'

const mockRepo = productRepository as any

const sampleProduct = {
    id: 'prod-1',
    name: 'Widget',
    price: 29.99,
    quantity: 10,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('ProductService.getById', () => {
    it('returns product when found', async () => {
        mockRepo.findById.mockResolvedValue(sampleProduct)
        const result = await productService.getById('prod-1')
        expect(result).toEqual(sampleProduct)
        expect(mockRepo.findById).toHaveBeenCalledWith('prod-1')
    })

    it('throws NotFoundError when not found', async () => {
        mockRepo.findById.mockResolvedValue(null)
        await expect(productService.getById('missing')).rejects.toThrow(NotFoundError)
    })
})

describe('ProductService.create', () => {
    it('creates product when name is unique', async () => {
        mockRepo.findByName.mockResolvedValue(null)
        mockRepo.create.mockResolvedValue(sampleProduct)

        const result = await productService.create({ name: 'Widget', price: 29.99, quantity: 10 } as any)
        expect(result).toEqual(sampleProduct)
    })

    it('throws ConflictError when name already exists', async () => {
        mockRepo.findByName.mockResolvedValue(sampleProduct)
        await expect(
            productService.create({ name: 'Widget', price: 29.99, quantity: 10 } as any)
        ).rejects.toThrow(ConflictError)
    })
})

describe('ProductService.update', () => {
    it('returns updated product', async () => {
        const updated = { ...sampleProduct, name: 'Updated' }
        mockRepo.update.mockResolvedValue(updated)

        const result = await productService.update('prod-1', { name: 'Updated' } as any)
        expect(result.name).toBe('Updated')
    })

    it('throws NotFoundError when product does not exist', async () => {
        mockRepo.update.mockResolvedValue(null)
        await expect(productService.update('missing', {} as any)).rejects.toThrow(NotFoundError)
    })
})

describe('ProductService.delete', () => {
    it('soft-deletes successfully', async () => {
        mockRepo.softDelete.mockResolvedValue(true)
        await expect(productService.delete('prod-1')).resolves.toBeUndefined()
    })

    it('throws NotFoundError when product does not exist', async () => {
        mockRepo.softDelete.mockResolvedValue(false)
        await expect(productService.delete('missing')).rejects.toThrow(NotFoundError)
    })
})

describe('ProductService.decrementStock', () => {
    it('decrements stock', async () => {
        const decremented = { ...sampleProduct, quantity: 5 }
        mockRepo.decrementStock.mockResolvedValue(decremented)

        const result = await productService.decrementStock('prod-1', 5)
        expect(result.quantity).toBe(5)
    })
})
