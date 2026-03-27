import { stripe } from '@/lib/stripe'
import { paymentRepository } from '@/repositories/payment.repository'
import { orderRepository } from '@/repositories/order.repository'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, BadRequestError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { PaymentStatus } from '@prisma/client'

class PaymentService {
    async getAll(params: QueryParams) {
        return paymentRepository.findMany(params)
    }

    async getById(id: string) {
        const payment = await paymentRepository.findById(id)

        if (!payment) {
            throw new NotFoundError('Payment not found')
        }

        return payment
    }

    /**
     * Creates a Stripe PaymentIntent for embedded payment on the checkout page.
     * Returns the client secret needed by Stripe Elements.
     */
    async createPaymentIntent(orderId: string, preloadedOrder?: { id: string; paymentStatus: string; shippingFirstName: string | null; shippingLastName: string | null; shippingStreet: string | null; shippingCity: string | null; shippingZipCode: string | null; shippingCountry: string | null; expiresAt: Date | null; status: string; stripePaymentIntentId: string | null; totalPrice: number | { toNumber(): number } }) {
        const order = preloadedOrder ?? await orderRepository.findWithDetails(orderId)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.paymentStatus === 'succeeded') {
            throw new BadRequestError('Order is already paid')
        }

        if (!order.shippingFirstName || !order.shippingLastName || !order.shippingStreet || !order.shippingCity || !order.shippingZipCode || !order.shippingCountry) {
            throw new BadRequestError('Shipping address is required before payment')
        }

        if (order.expiresAt && order.expiresAt <= new Date() && order.status === 'pending') {
            const { orderService } = await import('@/services/order.service')
            await orderService.cancelExpired(orderId)
            throw new BadRequestError('Order has expired')
        }

        if (order.stripePaymentIntentId) {
            const existingIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
            if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
                return { clientSecret: existingIntent.client_secret! }
            }
        }

        const totalPrice = typeof order.totalPrice === 'object' && 'toNumber' in order.totalPrice
            ? order.totalPrice.toNumber()
            : Number(order.totalPrice)
        const amount = Math.round(totalPrice * 100)

        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount,
                currency: 'eur',
                metadata: { orderId: order.id },
                automatic_payment_methods: { enabled: true },
            },
            { idempotencyKey: `create-pi-${order.id}` },
        )

        await orderRepository.update(order.id, {
            stripePaymentIntentId: paymentIntent.id,
        })

        return { clientSecret: paymentIntent.client_secret! }
    }

    /**
     * Checks the Stripe PaymentIntent status and syncs it to the order + payment record.
     * Called after the user returns from Stripe payment confirmation to ensure
     * the order status is up-to-date even without webhooks.
     */
    async syncPaymentStatus(orderId: string) {
        const order = await orderRepository.findWithDetails(orderId)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (!order.stripePaymentIntentId) {
            return order
        }

        if (order.paymentStatus === 'succeeded') {
            return order
        }

        const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)

        const statusMapping: Record<string, PaymentStatus> = {
            requires_payment_method: 'requires_payment_method',
            requires_confirmation: 'requires_confirmation',
            requires_action: 'requires_action',
            processing: 'processing',
            requires_capture: 'requires_capture',
            canceled: 'canceled',
            succeeded: 'succeeded',
        }

        const newStatus = statusMapping[intent.status]
        if (!newStatus || newStatus === order.paymentStatus) {
            return order
        }

        let existingPayment = await paymentRepository.findByStripePaymentIntentId(order.stripePaymentIntentId)
        if (!existingPayment) {
            existingPayment = await paymentRepository.findOne({ orderId }) as any
        }

        if (existingPayment && existingPayment.status === newStatus) {
            return orderRepository.findWithDetails(orderId)
        }

        await orderRepository.updatePaymentStatus(orderId, newStatus)

        if (newStatus === 'succeeded') {
            await orderRepository.updateStatus(orderId, 'confirmed')
            await orderRepository.update(orderId, { expiresAt: null })
        } else if (newStatus === 'canceled' && order.status !== 'expired') {
            await orderRepository.updateStatus(orderId, 'canceled')
        }

        if (existingPayment) {
            await paymentRepository.updateStatus(existingPayment.id, newStatus)
        } else if (newStatus === 'succeeded' || newStatus === 'processing') {
            await paymentRepository.create({
                order: { connect: { id: orderId } },
                stripePaymentIntentId: order.stripePaymentIntentId,
                amount: Number(order.totalPrice),
                status: newStatus,
            })
        }

        return orderRepository.findWithDetails(orderId)
    }

    /**
     * Records a payment for an order.
     * Called after Stripe confirms the payment intent.
     */
    async create(data: {
        orderId: string
        stripePaymentIntentId: string
        amount: number
        status: PaymentStatus
    }) {
        const order = await orderRepository.findById(data.orderId)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        const payment = await paymentRepository.create({
            order: { connect: { id: data.orderId } },
            stripePaymentIntentId: data.stripePaymentIntentId,
            amount: data.amount,
            status: data.status,
        })

        await orderRepository.updatePaymentStatus(data.orderId, data.status)

        if (data.status === 'succeeded') {
            await orderRepository.updateStatus(data.orderId, 'confirmed')
            await orderRepository.update(data.orderId, { expiresAt: null })
        }

        return payment
    }

    /**
     * Updates payment status — typically called from Stripe webhooks.
     */
    async updateStatus(id: string, status: PaymentStatus) {
        const payment = await paymentRepository.updateStatus(id, status)

        if (!payment) {
            throw new NotFoundError('Payment not found')
        }

        await orderRepository.updatePaymentStatus(payment.orderId, status)

        if (status === 'succeeded') {
            await orderRepository.updateStatus(payment.orderId, 'confirmed')
            await orderRepository.update(payment.orderId, { expiresAt: null })
        } else if (status === 'canceled') {
            const currentOrder = await orderRepository.findById(payment.orderId)
            if (currentOrder?.status !== 'expired') {
                await orderRepository.updateStatus(payment.orderId, 'canceled')
            }
        }

        return payment
    }


    /**
     * Handles a Stripe webhook event for a payment intent.
     * Verifies the paid amount matches the order total to prevent tampering.
     * Skips duplicate events (idempotent).
     */
    async handleStripeWebhook(stripePaymentIntentId: string, status: PaymentStatus, amountReceived?: number) {
        const [existing, order] = await Promise.all([
            paymentRepository.findByStripePaymentIntentId(stripePaymentIntentId),
            orderRepository.findByStripePaymentIntentId(stripePaymentIntentId),
        ])

        if (existing) {
            if (existing.status === status) {
                return existing
            }
            return this.updateStatus(existing.id, status)
        }

        if (!order) {
            throw new NotFoundError('Order not found for payment intent')
        }

        if (status === 'succeeded' && amountReceived !== undefined) {
            const expectedAmount = Math.round(Number(order.totalPrice) * 100)
            if (amountReceived !== expectedAmount) {
                console.error(`[Payment] Amount mismatch for order ${order.id}: expected ${expectedAmount}, got ${amountReceived}`)
                throw new BadRequestError('Payment amount does not match order total')
            }
        }

        const existingForOrder = await paymentRepository.findOne({ orderId: order.id }) as any
        if (existingForOrder) {
            return this.updateStatus(existingForOrder.id, status)
        }

        return this.create({
            orderId: order.id,
            stripePaymentIntentId,
            amount: Number(order.totalPrice),
            status,
        })
    }

    /**
     * Handles checkout.session.completed — records payment from the completed session.
     */
    async handleCheckoutCompleted(sessionId: string) {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        })

        const orderId = session.metadata?.orderId
        if (!orderId) {
            throw new BadRequestError('Missing orderId in session metadata')
        }

        const paymentIntent = session.payment_intent as { id: string; status: string; amount_received?: number } | string
        const intentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id

        let amountReceived: number | undefined
        if (typeof paymentIntent === 'string') {
            const fullIntent = await stripe.paymentIntents.retrieve(paymentIntent)
            amountReceived = fullIntent.amount_received
        } else {
            amountReceived = paymentIntent.amount_received
        }

        await orderRepository.update(orderId, { stripePaymentIntentId: intentId })

        return this.handleStripeWebhook(intentId, 'succeeded', amountReceived)
    }
}

export const paymentService = new PaymentService()
