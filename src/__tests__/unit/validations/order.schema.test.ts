import { describe, it, expect } from 'vitest'
import { orderCreateSchema, orderStatusEnum, paymentStatusEnum, shippingAddressSchema } from '@/validations/order.schema'

describe('orderStatusEnum', () => {
    it.each(['pending', 'confirmed', 'shipped', 'delivered', 'canceled', 'expired'])('accepts "%s"', (status) => {
        expect(orderStatusEnum.safeParse(status).success).toBe(true)
    })

    it('rejects invalid status', () => {
        expect(orderStatusEnum.safeParse('unknown').success).toBe(false)
    })
})

describe('paymentStatusEnum', () => {
    it.each([
        'requires_payment_method', 'requires_confirmation', 'requires_action',
        'processing', 'requires_capture', 'canceled', 'succeeded', 'refunded',
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

describe('shippingAddressSchema', () => {
    const validAddress = {
        shippingFirstName: 'John',
        shippingLastName: 'Doe',
        shippingStreet: '123 Main St',
        shippingCity: 'Paris',
        shippingZipCode: '75001',
        shippingCountry: 'France',
    }

    it('accepts valid address', () => {
        expect(shippingAddressSchema.safeParse(validAddress).success).toBe(true)
    })

    it('accepts address with optional phone', () => {
        const result = shippingAddressSchema.safeParse({ ...validAddress, shippingPhone: '+33612345678' })
        expect(result.success).toBe(true)
    })

    it.each([
        'shippingFirstName',
        'shippingLastName',
        'shippingStreet',
        'shippingCity',
        'shippingZipCode',
        'shippingCountry',
    ])('rejects empty %s', (field) => {
        const result = shippingAddressSchema.safeParse({ ...validAddress, [field]: '' })
        expect(result.success).toBe(false)
    })

    it.each([
        'shippingFirstName',
        'shippingLastName',
        'shippingStreet',
        'shippingCity',
        'shippingZipCode',
        'shippingCountry',
    ])('rejects missing %s', (field) => {
        const copy = { ...validAddress } as Record<string, string>
        delete copy[field]
        expect(shippingAddressSchema.safeParse(copy).success).toBe(false)
    })

    it('trims whitespace from fields', () => {
        const result = shippingAddressSchema.parse({ ...validAddress, shippingFirstName: '  John  ' })
        expect(result.shippingFirstName).toBe('John')
    })

    it('rejects first name exceeding max length', () => {
        const result = shippingAddressSchema.safeParse({ ...validAddress, shippingFirstName: 'A'.repeat(51) })
        expect(result.success).toBe(false)
    })

    it('rejects street exceeding max length', () => {
        const result = shippingAddressSchema.safeParse({ ...validAddress, shippingStreet: 'A'.repeat(201) })
        expect(result.success).toBe(false)
    })
})
