import { orderRepository } from '@/repositories/order.repository'
import { cartRepository } from '@/repositories/cart.repository'
import { productRepository } from '@/repositories/product.repository'
import { NotFoundError, BadRequestError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { OrderStatus, PaymentStatus } from '@prisma/client'

class OrderService {
    async getAll(params: QueryParams) {
        return orderRepository.findMany(params)
    }

    async getById(id: string) {
        const order = await orderRepository.findWithDetails(id)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        return order
    }

    async getByUserId(userId: string) {
        return orderRepository.findByUserId(userId)
    }

    async getByStripePaymentIntentId(stripePaymentIntentId: string) {
        const order = await orderRepository.findByStripePaymentIntentId(stripePaymentIntentId)

        if (!order) {
            throw new NotFoundError('Order not found')
        }

        return order
    }

    /**
     * Creates an order from the user's cart.
     * Validates stock, computes total, decrements inventory, and clears the cart.
     */
    async createFromCart(userId: string, paymentStatus: PaymentStatus = 'requires_payment_method', stripePaymentIntentId?: string) {
        const cart = await cartRepository.findByUserId(userId)

        if (!cart || cart.items.length === 0) {
            throw new BadRequestError('Cart is empty')
        }

        // Validate stock for all items
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

        // Compute total price
        const totalPrice = cart.items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0,
        )

        // Create order with items
        const order = await orderRepository.createWithItems({
            userId,
            totalPrice,
            paymentStatus,
            stripePaymentIntentId,
            items: cart.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
        })

        // Decrement stock
        for (const item of cart.items) {
            await productRepository.decrementStock(item.productId, item.quantity)
        }

        // Clear the cart
        await cartRepository.clearItems(cart.id)

        return order
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

        // Restore stock
        for (const item of order.items) {
            await productRepository.updateStock(
                item.productId,
                (await productRepository.findById(item.productId))!.quantity + item.quantity,
            )
        }

        return orderRepository.updateStatus(id, 'canceled')
    }
}

export const orderService = new OrderService()
