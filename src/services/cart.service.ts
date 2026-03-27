import { cartRepository } from '@/repositories/cart.repository'
import { productRepository } from '@/repositories/product.repository'
import { NotFoundError, BadRequestError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'

class CartService {
    async getAll(params: QueryParams) {
        return cartRepository.findMany(params)
    }

    async getById(id: string) {
        const cart = await cartRepository.findWithItems(id)

        if (!cart) {
            throw new NotFoundError('Cart not found')
        }

        return cart
    }

    async getByUserId(userId: string) {
        return cartRepository.getOrCreate(userId)
    }

    async addItem(userId: string, productId: string, quantity: number) {
        const product = await productRepository.findById(productId)

        if (!product) {
            throw new NotFoundError('Product not found')
        }

        if (product.isArchived || product.deletedAt) {
            throw new BadRequestError('Product is not available')
        }

        if (product.quantity < quantity) {
            throw new BadRequestError('Insufficient stock')
        }

        const cart = await cartRepository.getOrCreate(userId)

        await cartRepository.addItem(cart.id, productId, quantity, Number(product.price))

        return cartRepository.findWithItems(cart.id)
    }

    async updateItemQuantity(userId: string, cartItemId: string, quantity: number) {
        const cart = await cartRepository.getOrCreate(userId)
        const item = cart.items.find((i: any) => i.id === cartItemId)

        if (!item) {
            throw new NotFoundError('Cart item not found')
        }

        if (quantity <= 0) {
            await cartRepository.removeItem(cartItemId)
        } else {
            const product = await productRepository.findById(item.productId)

            if (!product || product.quantity < quantity) {
                throw new BadRequestError('Insufficient stock')
            }

            await cartRepository.updateItemQuantity(cartItemId, quantity)
        }

        return cartRepository.findWithItems(cart.id)
    }

    async removeItem(userId: string, cartItemId: string) {
        const cart = await cartRepository.getOrCreate(userId)
        const item = cart.items.find((i: any) => i.id === cartItemId)

        if (!item) {
            throw new NotFoundError('Cart item not found')
        }

        await cartRepository.removeItem(cartItemId)

        return cartRepository.findWithItems(cart.id)
    }

    async clear(userId: string) {
        const cart = await cartRepository.findByUserId(userId)

        if (!cart) {
            throw new NotFoundError('Cart not found')
        }

        await cartRepository.clearItems(cart.id)

        return cartRepository.findWithItems(cart.id)
    }

    async delete(id: string) {
        const ok = await cartRepository.hardDelete(id)

        if (!ok) {
            throw new NotFoundError('Cart not found')
        }
    }
}

export const cartService = new CartService()
