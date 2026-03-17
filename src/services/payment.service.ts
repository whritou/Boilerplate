import { stripe } from '@/lib/stripe'
import { paymentRepository } from '@/repositories/payment.repository'
import { orderRepository } from '@/repositories/order.repository'
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

    async getByOrderId(orderId: string) {
        const payment = await paymentRepository.findByOrderId(orderId)

        if (!payment) {
            throw new NotFoundError('Payment not found')
        }

        return payment
    }

    async getByStripePaymentIntentId(stripePaymentIntentId: string) {
        const payment = await paymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)

        if (!payment) {
            throw new NotFoundError('Payment not found')
        }

        return payment
    }

    // ── Stripe Payment Intent (embedded) ─────────────────────────────────────

    /**
     * Creates a Stripe PaymentIntent for embedded payment on the checkout page.
     * Returns the client secret needed by Stripe Elements.
     */
    async createPaymentIntent(orderId: string) {
        const order = await orderRepository.findWithDetails(orderId)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.paymentStatus === 'succeeded') {
            throw new BadRequestError('Order is already paid')
        }

        // If order already has a payment intent, retrieve it instead of creating a new one
        if (order.stripePaymentIntentId) {
            const existingIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId)
            if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
                return { clientSecret: existingIntent.client_secret! }
            }
        }

        const amount = Math.round(order.totalPrice * 100) // cents

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'eur',
            metadata: { orderId: order.id },
            automatic_payment_methods: { enabled: true },
        })

        // Persist the payment intent ID on the order
        await orderRepository.update(order.id, {
            stripePaymentIntentId: paymentIntent.id,
        })

        return { clientSecret: paymentIntent.client_secret! }
    }

    // ── Sync Payment Status ─────────────────────────────────────────────────

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
            return order // No payment intent yet, nothing to sync
        }

        if (order.paymentStatus === 'succeeded') {
            return order // Already paid, skip
        }

        // Retrieve the current status from Stripe
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
            return order // No change
        }

        // Update order payment status
        await orderRepository.updatePaymentStatus(orderId, newStatus)

        // Update order status based on payment
        if (newStatus === 'succeeded') {
            await orderRepository.updateStatus(orderId, 'confirmed')
        } else if (newStatus === 'canceled') {
            await orderRepository.updateStatus(orderId, 'canceled')
        }

        // Create or update payment record
        const existingPayment = await paymentRepository.findByStripePaymentIntentId(order.stripePaymentIntentId)

        if (existingPayment) {
            await paymentRepository.updateStatus(existingPayment.id, newStatus)
        } else if (newStatus === 'succeeded' || newStatus === 'processing') {
            await paymentRepository.create({
                order: { connect: { id: orderId } },
                stripePaymentIntentId: order.stripePaymentIntentId,
                amount: order.totalPrice,
                status: newStatus,
            })
        }

        // Return the updated order
        return orderRepository.findWithDetails(orderId)
    }

    // ── Stripe Checkout ──────────────────────────────────────────────────────

    /**
     * Creates a Stripe Checkout Session for a given order.
     */
    async createCheckoutSession(orderId: string, successUrl: string, cancelUrl: string) {
        const order = await orderRepository.findWithDetails(orderId)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        if (order.paymentStatus === 'succeeded') {
            throw new BadRequestError('Order is already paid')
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: order.items.map((item) => ({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.product.name,
                        ...(item.product.imageUrl ? { images: [item.product.imageUrl] } : {}),
                    },
                    unit_amount: Math.round(item.price * 100), // cents
                },
                quantity: item.quantity,
            })),
            metadata: { orderId: order.id },
            success_url: successUrl,
            cancel_url: cancelUrl,
        })

        // Persist the Stripe session's payment intent on the order
        if (session.payment_intent) {
            await orderRepository.update(order.id, {
                stripePaymentIntentId: session.payment_intent as string,
            })
        }

        return { sessionId: session.id, url: session.url }
    }

    // ── Payment record CRUD ──────────────────────────────────────────────────

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
        } else if (status === 'canceled') {
            await orderRepository.updateStatus(payment.orderId, 'canceled')
        }

        return payment
    }

    // ── Stripe Webhooks ──────────────────────────────────────────────────────

    /**
     * Handles a Stripe webhook event for a payment intent.
     */
    async handleStripeWebhook(stripePaymentIntentId: string, status: PaymentStatus) {
        const existing = await paymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)

        if (existing) {
            return this.updateStatus(existing.id, status)
        }

        const order = await orderRepository.findByStripePaymentIntentId(stripePaymentIntentId)

        if (!order) {
            throw new NotFoundError('Order not found for payment intent')
        }

        return this.create({
            orderId: order.id,
            stripePaymentIntentId,
            amount: order.totalPrice,
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

        const paymentIntent = session.payment_intent as { id: string; status: string } | string
        const intentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id

        await orderRepository.update(orderId, { stripePaymentIntentId: intentId })

        return this.handleStripeWebhook(intentId, 'succeeded')
    }
}

export const paymentService = new PaymentService()
