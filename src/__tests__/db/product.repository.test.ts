import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        product: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
            upsert: vi.fn(),
        },
    },
}))

import { prisma } from '@/lib/db/prisma'
import { productRepository } from '@/repositories/product.repository'

const mockPrisma = prisma.product as any

beforeEach(() => {
    vi.clearAllMocks()
})

const sampleProduct = {
    id: 'prod-1',
    name: 'Widget',
    description: 'A widget',
    imageUrl: null,
    price: 29.99,
    quantity: 10,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
}

describe('ProductRepository', () => {
    describe('findByName', () => {
        it('returns product by unique name', async () => {
            mockPrisma.findUnique.mockResolvedValue(sampleProduct)
            const result = await productRepository.findByName('Widget')
            expect(result).toEqual(sampleProduct)
            expect(mockPrisma.findUnique).toHaveBeenCalledWith({
                where: { name: 'Widget', deletedAt: null },
            })
        })

        it('returns null when not found', async () => {
            mockPrisma.findUnique.mockResolvedValue(null)
            const result = await productRepository.findByName('Missing')
            expect(result).toBeNull()
        })
    })

    describe('findAvailable', () => {
        it('returns non-archived products with stock', async () => {
            mockPrisma.findMany.mockResolvedValue([sampleProduct])
            const result = await productRepository.findAvailable()
            expect(result).toHaveLength(1)
            expect(mockPrisma.findMany).toHaveBeenCalledWith({
                where: { quantity: { gt: 0 }, isArchived: false, deletedAt: null },
            })
        })
    })

    describe('archive', () => {
        it('sets isArchived to true', async () => {
            mockPrisma.update.mockResolvedValue({ ...sampleProduct, isArchived: true })
            const result = await productRepository.archive('prod-1')
            expect(result.isArchived).toBe(true)
            expect(mockPrisma.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { isArchived: true },
            })
        })
    })

    describe('decrementStock', () => {
        it('decrements quantity by amount', async () => {
            mockPrisma.update.mockResolvedValue({ ...sampleProduct, quantity: 5 })
            const result = await productRepository.decrementStock('prod-1', 5)
            expect(result.quantity).toBe(5)
            expect(mockPrisma.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { quantity: { decrement: 5 } },
            })
        })
    })
})
