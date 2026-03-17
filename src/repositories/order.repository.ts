import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig } from './base.repository'
import type { Order, Prisma, OrderStatus, PaymentStatus } from '@prisma/client'

class OrderRepository extends BaseRepository<
    Order,
    Prisma.OrderCreateInput,
    Prisma.OrderUpdateInput
> {
    protected get model() {
        return prisma.order as any
    }

    protected get config(): RepositoryConfig {
        return {
            allowedSortFields: ['createdAt', 'updatedAt', 'totalPrice', 'status'],
            allowedFilters:    ['status', 'paymentStatus', 'userId'],
            allowedIncludes:   ['items', 'items.product', 'payment', 'user'],
            searchFields:      ['id', 'userId'],
            defaultSortField:  'createdAt',
        }
    }

    /**
     * Fetch a single order with all related data (items + products + payment).
     * Used by services that always need full order details (cancel, expiration, payment).
     */
    async findWithDetails(id: string) {
        return prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: true },
                },
                payment: true,
            },
        })
    }

    async findByUserId(userId: string) {
        return prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }

    /**
     * Find order by Stripe PaymentIntent ID.
     * Includes items (needed for amount calculations in payment processing).
     */
    async findByStripePaymentIntentId(stripePaymentIntentId: string) {
        return prisma.order.findFirst({
            where: { stripePaymentIntentId },
        })
    }

    async updateStatus(id: string, status: OrderStatus) {
        return prisma.order.update({
            where: { id },
            data: { status },
        })
    }

    async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
        return prisma.order.update({
            where: { id },
            data: { paymentStatus },
        })
    }

    async createWithItems(
        data: {
            userId: string
            totalPrice: number
            paymentStatus: PaymentStatus
            stripePaymentIntentId?: string
            expiresAt?: Date
            items: { productId: string; quantity: number; price: number }[]
        },
    ) {
        return prisma.order.create({
            data: {
                userId: data.userId,
                totalPrice: data.totalPrice,
                paymentStatus: data.paymentStatus,
                stripePaymentIntentId: data.stripePaymentIntentId,
                expiresAt: data.expiresAt,
                items: {
                    create: data.items,
                },
            },
            include: {
                items: true,
            },
        })
    }

    /**
     * Find all expired unpaid orders (pending + not succeeded/processing + past expiresAt).
     */
    async findExpiredUnpaid() {
        return prisma.order.findMany({
            where: {
                status: 'pending',
                paymentStatus: { notIn: ['succeeded', 'processing'] },
                expiresAt: { not: null, lte: new Date() },
            },
            include: {
                items: true,
            },
        })
    }
}

export const orderRepository = new OrderRepository()
