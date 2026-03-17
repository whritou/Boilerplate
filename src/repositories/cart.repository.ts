import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig } from './base.repository'
import type { Cart, Prisma } from '@prisma/client'

class CartRepository extends BaseRepository<
    Cart,
    Prisma.CartCreateInput,
    Prisma.CartUpdateInput
> {
    protected get model() {
        return prisma.cart as any
    }

    protected get config(): RepositoryConfig {
        return {
            allowedSortFields: ['createdAt', 'updatedAt'],
            allowedFilters:    ['userId'],
            allowedIncludes:   ['items', 'items.product'],
            defaultSortField:  'createdAt',
        }
    }

    async findByUserId(userId: string) {
        return prisma.cart.findFirst({
            where: { userId },
            include: {
                items: {
                    include: { product: true },
                },
            },
        })
    }

    async findWithItems(id: string) {
        return prisma.cart.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: true },
                },
            },
        })
    }

    async addItem(cartId: string, productId: string, quantity: number, price: number) {
        const existing = await prisma.cartItem.findFirst({
            where: { cartId, productId },
        })

        if (existing) {
            return prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity },
            })
        }

        return prisma.cartItem.create({
            data: { cartId, productId, quantity, price },
        })
    }

    async updateItemQuantity(cartItemId: string, quantity: number) {
        return prisma.cartItem.update({
            where: { id: cartItemId },
            data: { quantity },
        })
    }

    async removeItem(cartItemId: string) {
        return prisma.cartItem.delete({
            where: { id: cartItemId },
        })
    }

    async clearItems(cartId: string) {
        return prisma.cartItem.deleteMany({
            where: { cartId },
        })
    }

    async getOrCreate(userId: string) {
        let cart = await this.findByUserId(userId)

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: {
                    items: {
                        include: { product: true },
                    },
                },
            })
        }

        return cart
    }
}

export const cartRepository = new CartRepository()
