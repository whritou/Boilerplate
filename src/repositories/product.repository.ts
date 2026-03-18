import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig } from './base.repository'
import type { Product, Prisma } from '@prisma/client'

class ProductRepository extends BaseRepository<
    Product,
    Prisma.ProductCreateInput,
    Prisma.ProductUpdateInput
> {
    protected get model() {
        return prisma.product as any
    }

    protected get config(): RepositoryConfig {
        return {
            allowedSortFields: ['name', 'price', 'quantity', 'createdAt'],
            allowedFilters:    ['isArchived'],
            allowedIncludes:   ['cartItems', 'orderItems'],
            searchFields:      ['name', 'description'],
            defaultSortField:  'name',
            softDelete:        true,
        }
    }

    static readonly defaultSelect = {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
        quantity: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
    }

    async findByName(name: string) {
        return prisma.product.findUnique({
            where: { name, deletedAt: null },
        })
    }

    async findAvailable() {
        return prisma.product.findMany({
            where: {
                quantity: { gt: 0 },
                isArchived: false,
                deletedAt: null,
            },
        })
    }

    async decrementStock(id: string, quantity: number) {
        return prisma.product.update({
            where: { id },
            data: {
                quantity: {
                    decrement: quantity,
                },
            },
        })
    }

    async incrementStock(id: string, quantity: number) {
        return prisma.product.update({
            where: { id },
            data: {
                quantity: {
                    increment: quantity,
                },
            },
        })
    }
}

export const productRepository = new ProductRepository()