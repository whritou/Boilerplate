import { orderRepository } from '@/repositories/order.repository'
import { cartRepository } from '@/repositories/cart.repository'
import { productRepository } from '@/repositories/product.repository'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { mailService } from '@/services/mail.service'
import { NotFoundError, BadRequestError, ForbiddenError } from '@/utils/errors'
import type { ShippingAddress } from '@/validations/order.schema'
import type { QueryParams } from '@/lib/query/types'
import type { OrderStatus, PaymentStatus } from '@prisma/client'

const ORDER_EXPIRATION_MINUTES = 15

class OrderService {
    async getAll(params: QueryParams) {
        return orderRepository.findMany(params)
    }

    async getById(id: string) {
        const order = await orderRepository.findWithDetails(id)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (this.isExpired(order)) {
            await this.cancelExpired(id)
            const updated = await orderRepository.findWithDetails(id)
            if (!updated) throw new NotFoundError('Order not found')
            return updated
        }

        return order
    }

    async getByUserId(userId: string) {
        return orderRepository.findByUserId(userId)
    }

    async createFromCart(userId: string, paymentStatus: PaymentStatus = 'requires_payment_method', stripePaymentIntentId?: string) {
        const cart = await cartRepository.findByUserId(userId)

        if (!cart || cart.items.length === 0) {
            throw new BadRequestError('Cart is empty')
        }

        const productIds = cart.items.map((item: any) => item.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        })
        const productMap = new Map(products.map((p) => [p.id, p]))

        const validatedItems: { productId: string; quantity: number; price: number; productName: string }[] = []

        for (const item of cart.items) {
            const product = productMap.get(item.productId)

            if (!product) {
                throw new NotFoundError(`Product ${item.productId} not found`)
            }

            if (product.isArchived || product.deletedAt) {
                throw new BadRequestError(`Product "${product.name}" is no longer available`)
            }

            if (product.quantity < item.quantity) {
                throw new BadRequestError(`Insufficient stock for "${product.name}"`)
            }

            validatedItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: Number(product.price),
                productName: product.name,
            })
        }

        const totalPrice = validatedItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
        )

        const expiresAt = new Date(Date.now() + ORDER_EXPIRATION_MINUTES * 60 * 1000)

        const order = await prisma.$transaction(async (tx) => {
            const created = await tx.order.create({
                data: {
                    userId,
                    totalPrice,
                    paymentStatus,
                    stripePaymentIntentId,
                    expiresAt,
                    items: {
                        create: validatedItems.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
                include: { items: true },
            })

            await Promise.all(
                validatedItems.map((item) =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { decrement: item.quantity } },
                    }),
                ),
            )

            return created
        })

        await cartRepository.clearItems(cart.id)

        return order
    }

    /**
     * Update shipping address on a pending order. Only the order owner can do this.
     */
    async updateShippingAddress(id: string, userId: string, data: ShippingAddress) {
        const order = await orderRepository.findById(id)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.userId !== userId) {
            throw new ForbiddenError()
        }

        if (order.status !== 'pending') {
            throw new BadRequestError('Cannot update address for this order')
        }

        if (order.paymentStatus === 'succeeded') {
            throw new BadRequestError('Order is already paid')
        }

        await orderRepository.update(id, data as any)
        return orderRepository.findWithDetails(id)
    }

    async updateStatus(id: string, status: OrderStatus) {
        const order = await orderRepository.updateStatus(id, status)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        return order
    }

    async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
        const order = await orderRepository.updatePaymentStatus(id, paymentStatus)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        return order
    }

    async cancel(id: string) {
        const order = await orderRepository.findWithDetails(id)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.status === 'shipped' || order.status === 'delivered') {
            throw new BadRequestError('Cannot cancel a shipped or delivered order')
        }

        await Promise.all(
            order.items.map((item) =>
                productRepository.incrementStock(item.productId, item.quantity),
            ),
        )

        if (order.stripePaymentIntentId) {
            try {
                await stripe.paymentIntents.cancel(order.stripePaymentIntentId)
            } catch (err) {
                console.error(`[Order] Failed to cancel Stripe PaymentIntent:`, err)
            }
        }

        await orderRepository.updatePaymentStatus(id, 'canceled')
        return orderRepository.updateStatus(id, 'canceled')
    }

    /**
     * Check if an order is expired (pending + unpaid + past expiresAt).
     */
    private isExpired(order: { expiresAt: Date | null; status: string; paymentStatus: string }): boolean {
        if (!order.expiresAt) return false
        return (
            order.status === 'pending' &&
            order.paymentStatus !== 'succeeded' &&
            order.paymentStatus !== 'processing' &&
            order.expiresAt <= new Date()
        )
    }

    /**
     * Cancel an expired order: restore stock, cancel Stripe PaymentIntent, update statuses.
     */
    async cancelExpired(id: string, preloadedOrder?: { stripePaymentIntentId: string | null; status: string; paymentStatus: string; items: { productId: string; quantity: number }[] }) {
        const order = preloadedOrder ?? await orderRepository.findWithDetails(id)
        if (!order) return
        if (order.status !== 'pending') return
        if (order.paymentStatus === 'succeeded' || order.paymentStatus === 'processing') return

        if (order.stripePaymentIntentId) {
            try {
                await stripe.paymentIntents.cancel(order.stripePaymentIntentId)
            } catch (err) {
                console.error(`[Order] Failed to cancel Stripe PaymentIntent:`, err)
            }
        }

        await Promise.all(
            order.items.map((item) =>
                productRepository.incrementStock(item.productId, item.quantity),
            ),
        )

        await orderRepository.updateStatus(id, 'expired')
        await orderRepository.updatePaymentStatus(id, 'canceled')
    }

    /**
     * Admin-initiated cancel + full refund.
     * Issues a Stripe refund, updates DB atomically, then sends email.
     * Email failure does NOT roll back the refund.
     */
    async cancelAndRefund(id: string) {
        const order = await orderRepository.findWithDetails(id)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.status === 'canceled') {
            throw new BadRequestError('Order is already cancelled')
        }

        if (order.status === 'expired') {
            throw new BadRequestError('Order is expired')
        }

        if (order.paymentStatus === 'refunded') {
            throw new BadRequestError('Order is already refunded')
        }

        if (order.paymentStatus !== 'succeeded') {
            throw new BadRequestError('Cannot refund an order that has not been paid')
        }

        if (!order.stripePaymentIntentId) {
            throw new BadRequestError('No payment intent found for this order')
        }

        const [existingRefunds, user] = await Promise.all([
            stripe.refunds.list({
                payment_intent: order.stripePaymentIntentId,
                limit: 1,
            }),
            prisma.user.findUnique({ where: { id: order.userId } }),
        ])

        if (existingRefunds.data.length > 0) {
            throw new BadRequestError('A partial refund already exists — manual review on stripe required')
        }

        let refund
        try {
            refund = await stripe.refunds.create(
                {
                    payment_intent: order.stripePaymentIntentId,
                    reason: 'requested_by_customer',
                },
                { idempotencyKey: `refund-${id}` },
            )
        } catch (err: any) {
            console.error(`[Order] Stripe refund failed for order ${id}:`, err)
            throw new BadRequestError('Refund failed — please try again or review on Stripe Dashboard')
        }

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id },
                data: { status: 'canceled', paymentStatus: 'refunded' },
            })

            await tx.payment.update({
                where: { orderId: id },
                data: { status: 'refunded', stripeRefundId: refund.id },
            })

            await Promise.all(
                order.items.map((item) =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { increment: item.quantity } },
                    }),
                ),
            )
        })

        try {
            if (user?.email) {
                await mailService.sendOrderRefundEmail(
                    user.email,
                    order.id,
                    Number(order.totalPrice).toFixed(2),
                )
            }
        } catch (err) {
            console.error(`[Order] Failed to send refund email for order ${id}:`, err)
        }

        return orderRepository.findWithDetails(id)
    }

    /**
     * Batch cancel all expired unpaid orders. Used by the cleanup cron job.
     */
    async cancelAllExpired() {
        const expiredOrders = await orderRepository.findExpiredUnpaid()

        for (const order of expiredOrders) {
            await this.cancelExpired(order.id, order)
        }

        return expiredOrders.length
    }
}

export const orderService = new OrderService()
