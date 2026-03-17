import { describe, it, expect } from 'vitest'
import { orderCreateSchema, orderStatusEnum, paymentStatusEnum } from '@/validations/order.schema'

describe('orderStatusEnum', () => {
    it.each(['pending', 'confirmed', 'shipped', 'delivered', 'canceled'])('accepts "%s"', (status) => {
        expect(orderStatusEnum.safeParse(status).success).toBe(true)
    })

    it('rejects invalid status', () => {
        expect(orderStatusEnum.safeParse('unknown').success).toBe(false)
    })
})

describe('paymentStatusEnum', () => {
    it.each([
        'requires_payment_method', 'requires_confirmation', 'requires_action',
        'processing', 'requires_capture', 'canceled', 'succeeded',
    ])('accepts "%s"', (status) => {
        expect(paymentStatusEnum.safeParse(status).success).toBe(true)
    })

    it('rejects invalid status', () => {
        expect(paymentStatusEnum.safeParse('paid').success).toBe(false)
    })
})

describe('orderCreateSchema', () => {
    const validOrder = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 2, price: '19.99' }],
        totalPrice: '39.98',
        status: 'pending',
        paymentStatus: 'requires_payment_method',
    }

    it('accepts valid order', () => {
        expect(orderCreateSchema.safeParse(validOrder).success).toBe(true)
    })

    it('rejects empty items', () => {
        const result = orderCreateSchema.safeParse({ ...validOrder, items: [] })
        expect(result.success).toBe(false)
    })

    it('rejects missing userId', () => {
        const { userId, ...rest } = validOrder
        expect(orderCreateSchema.safeParse(rest).success).toBe(false)
    })

    it('accepts optional stripePaymentIntentId', () => {
        const result = orderCreateSchema.safeParse({
            ...validOrder,
            stripePaymentIntentId: 'pi_123',
        })
        expect(result.success).toBe(true)
    })
})
