import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig } from './base.repository'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import type { QueryParams } from '@/lib/query/types'
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
            allowedIncludes:   ['items', 'items.product', 'payment'],
            searchFields:      ['id', 'userId'],
            defaultSortField:  'createdAt',
        }
    }

    /**
     * Override findMany to always include items (with product) and payment.
     */
    async findMany(params: QueryParams = {}) {
        const { skip, take, page, limit, orderBy, where } =
            QueryBuilder.build(params, this.config)

        const baseWhere = { ...where, ...(params.extraWhere ?? {}) }

        const [data, total] = await Promise.all([
            prisma.order.findMany({
                where: baseWhere,
                orderBy,
                skip,
                take,
                include: {
                    items: { include: { product: true } },
                    payment: true,
                },
            }),
            prisma.order.count({ where: baseWhere }),
        ])

        return QueryBuilder.buildPaginatedResult(data, total, page, limit)
    }

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
            include: {
                items: {
                    include: { product: true },
                },
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findByStripePaymentIntentId(stripePaymentIntentId: string) {
        return prisma.order.findFirst({
            where: { stripePaymentIntentId },
            include: {
                items: true,
                payment: true,
            },
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
            items: { productId: string; quantity: number; price: number }[]
        },
    ) {
        return prisma.order.create({
            data: {
                userId: data.userId,
                totalPrice: data.totalPrice,
                paymentStatus: data.paymentStatus,
                stripePaymentIntentId: data.stripePaymentIntentId,
                items: {
                    create: data.items,
                },
            },
            include: {
                items: true,
            },
        })
    }
}

export const orderRepository = new OrderRepository()
