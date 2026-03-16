import { productRepository } from '@/repositories/product.repository'
import { NotFoundError, ConflictError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma } from '@prisma/client'

class ProductService {
    async getAll(params: QueryParams) {
        return productRepository.findMany(params)
    }

    async getById(id: string) {
        const product = await productRepository.findById(id)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }

    async getByName(name: string) {
        const product = await productRepository.findByName(name)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }

    async getFullDetails(id: string) {
        const product = await productRepository.findWithFullDetails(id)

        if (!product) {
            throw new NotFoundError('Product not found')
        }
        return product
    }

    async getAvailable() {
        return productRepository.findAvailable()
    }

    async create(data: Prisma.ProductCreateInput) {
        const existing = await productRepository.findByName(data.name)

        if (existing) {
            throw new ConflictError('Product name already exists')
        }

        return productRepository.create(data)
    }

    async update(id: string, data: Prisma.ProductUpdateInput) {
        const product = await productRepository.update(id, data)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }

    async delete(id: string) {
        const ok = await productRepository.softDelete(id)

        if (!ok) {
            throw new NotFoundError('Product not found')
        }
    }

    async archive(id: string) {
        const product = await productRepository.archive(id)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }

    async unarchive(id: string) {
        const product = await productRepository.unarchive(id)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }

    async updateStock(id: string, quantity: number) {
        const product = await productRepository.updateStock(id, quantity)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }

    async decrementStock(id: string, quantity: number) {
        const product = await productRepository.decrementStock(id, quantity)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        return product
    }
}

export const productService = new ProductService()
