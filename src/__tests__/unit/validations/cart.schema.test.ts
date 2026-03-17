import { describe, it, expect } from 'vitest'
import { addToCartSchema, cartCreateSchema } from '@/validations/cart.schema'
import { cartItemCreateSchema } from '@/validations/cartItem.schema'

describe('addToCartSchema', () => {
    it('accepts valid add to cart data', () => {
        const result = addToCartSchema.safeParse({ productId: 'prod-1', quantity: 2 })
        expect(result.success).toBe(true)
    })

    it('rejects quantity less than 1', () => {
        const result = addToCartSchema.safeParse({ productId: 'prod-1', quantity: 0 })
        expect(result.success).toBe(false)
    })

    it('rejects missing productId', () => {
        const result = addToCartSchema.safeParse({ quantity: 1 })
        expect(result.success).toBe(false)
    })

    it('rejects non-integer quantity', () => {
        const result = addToCartSchema.safeParse({ productId: 'prod-1', quantity: 1.5 })
        expect(result.success).toBe(false)
    })
})

describe('cartItemCreateSchema', () => {
    it('accepts valid cart item', () => {
        const result = cartItemCreateSchema.safeParse({ productId: 'prod-1', quantity: 3 })
        expect(result.success).toBe(true)
    })
})

describe('cartCreateSchema', () => {
    it('accepts valid cart with items', () => {
        const result = cartCreateSchema.safeParse({
            userId: 'user-1',
            items: [{ productId: 'prod-1', quantity: 1 }],
        })
        expect(result.success).toBe(true)
    })

    it('accepts empty items array', () => {
        const result = cartCreateSchema.safeParse({ userId: 'user-1', items: [] })
        expect(result.success).toBe(true)
    })
})
