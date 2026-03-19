import { describe, it, expect } from 'vitest'
import { orderItemBaseSchema } from '@/validations/orderItem.schema'

describe('orderItemBaseSchema', () => {
    it('accepts valid order item data', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-1',
            quantity: 2,
            price: '19.99',
        })
        expect(result.success).toBe(true)
    })

    it('rejects missing price', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-1',
            quantity: 2,
        })
        expect(result.success).toBe(false)
    })

    it('rejects empty price', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-1',
            quantity: 2,
            price: '',
        })
        expect(result.success).toBe(false)
    })

    it('rejects empty productId', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: '',
            quantity: 2,
            price: '9.99',
        })
        expect(result.success).toBe(false)
    })

    it('rejects missing productId', () => {
        const result = orderItemBaseSchema.safeParse({
            quantity: 2,
            price: '9.99',
        })
        expect(result.success).toBe(false)
    })

    it('rejects fractional (non-integer) quantity', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-1',
            quantity: 1.5,
            price: '9.99',
        })
        expect(result.success).toBe(false)
    })

    it('rejects quantity of zero', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-1',
            quantity: 0,
            price: '9.99',
        })
        expect(result.success).toBe(false)
    })

    it('rejects negative quantity', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-1',
            quantity: -1,
            price: '9.99',
        })
        expect(result.success).toBe(false)
    })

    it('accepts quantity of 1', () => {
        const result = orderItemBaseSchema.safeParse({
            productId: 'prod-abc',
            quantity: 1,
            price: '5.00',
        })
        expect(result.success).toBe(true)
    })
})
