import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        product: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
            upsert: vi.fn(),
        },
    },
}))

import { productRepository } from '@/repositories/product.repository'
import { prisma } from '@/lib/db/prisma'

const mockPrisma = prisma as any

const sampleProduct = {
    id: 'prod-1',
    name: 'Widget',
    price: 29.99,
    quantity: 10,
    isArchived: false,
    deletedAt: null,
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('ProductRepository (base methods)', () => {
    it('findMany delegates to model.findMany and count', async () => {
        mockPrisma.product.findMany.mockResolvedValue([sampleProduct])
        mockPrisma.product.count.mockResolvedValue(1)

        const result = await productRepository.findMany({})

        expect(mockPrisma.product.findMany).toHaveBeenCalled()
        expect(result.data).toEqual([sampleProduct])
        expect(result.meta.total).toBe(1)
    })

    it('findById delegates to model.findUnique', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(sampleProduct)

        const result = await productRepository.findById('prod-1')

        expect(result).toEqual(sampleProduct)
    })
})

describe('ProductRepository.findByName', () => {
    it('finds product by name excluding deleted', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(sampleProduct)

        const result = await productRepository.findByName('Widget')

        expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { name: 'Widget', deletedAt: null },
            }),
        )
        expect(result).toEqual(sampleProduct)
    })

    it('returns null when not found', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(null)
        const result = await productRepository.findByName('Missing')
        expect(result).toBeNull()
    })
})

describe('ProductRepository.decrementStock', () => {
    it('decrements product quantity', async () => {
        const updated = { ...sampleProduct, quantity: 8 }
        mockPrisma.product.update.mockResolvedValue(updated)

        const result = await productRepository.decrementStock('prod-1', 2)

        expect(mockPrisma.product.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'prod-1' },
                data: { quantity: { decrement: 2 } },
            }),
        )
        expect(result).toEqual(updated)
    })
})

describe('ProductRepository.incrementStock', () => {
    it('increments product quantity', async () => {
        const updated = { ...sampleProduct, quantity: 12 }
        mockPrisma.product.update.mockResolvedValue(updated)

        const result = await productRepository.incrementStock('prod-1', 2)

        expect(mockPrisma.product.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'prod-1' },
                data: { quantity: { increment: 2 } },
            }),
        )
        expect(result).toEqual(updated)
    })
})

describe('ProductRepository.findAvailable', () => {
    it('finds products with quantity > 0 that are not archived or deleted', async () => {
        mockPrisma.product.findMany.mockResolvedValue([sampleProduct])

        const result = await productRepository.findAvailable()

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    quantity: { gt: 0 },
                    isArchived: false,
                    deletedAt: null,
                }),
            }),
        )
        expect(result).toEqual([sampleProduct])
    })
})
