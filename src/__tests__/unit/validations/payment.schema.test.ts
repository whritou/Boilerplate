import { describe, it, expect } from 'vitest'
import {
    paymentBaseSchema,
    paymentCreateSchema,
    paymentUpdateSchema,
    paymentParamsSchema,
} from '@/validations/payment.schema'

const validPayment = {
    orderId: 'order-123',
    stripePaymentIntentId: 'pi_abc123',
    amount: '99.99',
    status: 'succeeded',
}

describe('paymentBaseSchema', () => {
    it('accepts valid payment data', () => {
        const result = paymentBaseSchema.safeParse(validPayment)
        expect(result.success).toBe(true)
    })

    it('accepts all valid payment statuses', () => {
        const validStatuses = [
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
            'processing',
            'requires_capture',
            'canceled',
            'succeeded',
            'refunded',
        ]
        for (const status of validStatuses) {
            const result = paymentBaseSchema.safeParse({ ...validPayment, status })
            expect(result.success, `status "${status}" should be valid`).toBe(true)
        }
    })

    it('rejects invalid status', () => {
        const result = paymentBaseSchema.safeParse({ ...validPayment, status: 'unknown' })
        expect(result.success).toBe(false)
    })

    it('rejects missing orderId', () => {
        const { orderId: _, ...rest } = validPayment
        const result = paymentBaseSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })

    it('rejects empty orderId', () => {
        const result = paymentBaseSchema.safeParse({ ...validPayment, orderId: '' })
        expect(result.success).toBe(false)
    })

    it('rejects missing stripePaymentIntentId', () => {
        const { stripePaymentIntentId: _, ...rest } = validPayment
        const result = paymentBaseSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })

    it('rejects empty amount', () => {
        const result = paymentBaseSchema.safeParse({ ...validPayment, amount: '' })
        expect(result.success).toBe(false)
    })

    it('rejects missing status', () => {
        const { status: _, ...rest } = validPayment
        const result = paymentBaseSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })
})

describe('paymentCreateSchema', () => {
    it('accepts valid payment data', () => {
        const result = paymentCreateSchema.safeParse(validPayment)
        expect(result.success).toBe(true)
    })

    it('rejects missing required fields', () => {
        const result = paymentCreateSchema.safeParse({ orderId: 'order-1' })
        expect(result.success).toBe(false)
    })
})

describe('paymentUpdateSchema', () => {
    it('accepts empty object (all fields optional)', () => {
        const result = paymentUpdateSchema.safeParse({})
        expect(result.success).toBe(true)
    })

    it('accepts partial data (only status)', () => {
        const result = paymentUpdateSchema.safeParse({ status: 'processing' })
        expect(result.success).toBe(true)
    })

    it('accepts partial data (only orderId)', () => {
        const result = paymentUpdateSchema.safeParse({ orderId: 'order-456' })
        expect(result.success).toBe(true)
    })

    it('accepts full data', () => {
        const result = paymentUpdateSchema.safeParse(validPayment)
        expect(result.success).toBe(true)
    })

    it('still rejects invalid status', () => {
        const result = paymentUpdateSchema.safeParse({ status: 'bad-status' })
        expect(result.success).toBe(false)
    })
})

describe('paymentParamsSchema', () => {
    it('accepts valid id', () => {
        const result = paymentParamsSchema.safeParse({ id: 'payment-123' })
        expect(result.success).toBe(true)
    })

    it('rejects empty id', () => {
        const result = paymentParamsSchema.safeParse({ id: '' })
        expect(result.success).toBe(false)
    })

    it('rejects missing id', () => {
        const result = paymentParamsSchema.safeParse({})
        expect(result.success).toBe(false)
    })
})
