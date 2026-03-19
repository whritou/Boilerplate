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

const ORDER_EXPIRATION_MINUTES = 30

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

    /**
     * Creates an order from the user's cart.
     * Validates stock, computes total, decrements inventory, and clears the cart.
     * Sets an expiration time — if unpaid after ORDER_EXPIRATION_MINUTES, the order
     * will be automatically cancelled and stock restored.
     */
    async createFromCart(userId: string, paymentStatus: PaymentStatus = 'requires_payment_method', stripePaymentIntentId?: string) {
        const cart = await cartRepository.findByUserId(userId)

        if (!cart || cart.items.length === 0) {
            throw new BadRequestError('Cart is empty')
        }

        for (const item of cart.items) {
            const product = await productRepository.findById(item.productId)

            if (!product) {
                throw new NotFoundError(`Product ${item.productId} not found`)
            }

            if (product.isArchived || product.deletedAt) {
                throw new BadRequestError(`Product "${product.name}" is no longer available`)
            }

            if (product.quantity < item.quantity) {
                throw new BadRequestError(`Insufficient stock for "${product.name}"`)
            }
        }

        const totalPrice = cart.items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0,
        )

        const expiresAt = new Date(Date.now() + ORDER_EXPIRATION_MINUTES * 60 * 1000)

        const order = await orderRepository.createWithItems({
            userId,
            totalPrice,
            paymentStatus,
            stripePaymentIntentId,
            expiresAt,
            items: cart.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
        })

        for (const item of cart.items) {
            await productRepository.decrementStock(item.productId, item.quantity)
        }

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

        return orderRepository.update(id, data as any)
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

    /**
     * User-initiated cancellation. Restores stock atomically.
     */
    async cancel(id: string) {
        const order = await orderRepository.findWithDetails(id)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.status === 'shipped' || order.status === 'delivered') {
            throw new BadRequestError('Cannot cancel a shipped or delivered order')
        }

        for (const item of order.items) {
            await productRepository.incrementStock(item.productId, item.quantity)
        }

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
    async cancelExpired(id: string) {
        const order = await orderRepository.findWithDetails(id)
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

        for (const item of order.items) {
            await productRepository.incrementStock(item.productId, item.quantity)
        }

        await orderRepository.updateStatus(id, 'canceled')
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

        if (order.paymentStatus === 'refunded') {
            throw new BadRequestError('Order is already refunded')
        }

        if (order.paymentStatus !== 'succeeded') {
            throw new BadRequestError('Cannot refund an order that has not been paid')
        }

        if (!order.stripePaymentIntentId) {
            throw new BadRequestError('No payment intent found for this order')
        }

        // Check for existing partial refunds on Stripe side
        const existingRefunds = await stripe.refunds.list({
            payment_intent: order.stripePaymentIntentId,
            limit: 1,
        })

        if (existingRefunds.data.length > 0) {
            throw new BadRequestError('A partial refund already exists — manual review on stripe required')
        }

        // Issue Stripe refund with idempotency key
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
            const message = err?.message || 'Stripe refund failed'
            console.error(`[Order] Stripe refund failed for order ${id}:`, err)
            throw new BadRequestError(`Refund failed: ${message}`)
        }

        // Atomic DB update — order canceled + payment refunded + store refund ID
        await prisma.$transaction([
            prisma.order.update({
                where: { id },
                data: { status: 'canceled', paymentStatus: 'refunded' },
            }),
            prisma.payment.update({
                where: { orderId: id },
                data: { status: 'refunded', stripeRefundId: refund.id },
            }),
        ])

        // Restore stock
        for (const item of order.items) {
            await productRepository.incrementStock(item.productId, item.quantity)
        }

        // Send email — failure is logged but does NOT roll back the refund
        try {
            const user = await prisma.user.findUnique({ where: { id: order.userId } })
            if (user?.email) {
                await mailService.sendOrderRefundEmail(
                    user.email,
                    order.id,
                    order.totalPrice.toFixed(2),
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
            await this.cancelExpired(order.id)
        }

        return expiredOrders.length
    }
}

export const orderService = new OrderService()
