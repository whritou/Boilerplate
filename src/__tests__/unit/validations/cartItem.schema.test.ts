import { describe, it, expect } from 'vitest'
import {
    cartItemBaseSchema,
    cartItemCreateSchema,
    cartItemUpdateSchema,
    cartItemParamsSchema,
} from '@/validations/cartItem.schema'

describe('cartItemBaseSchema', () => {
    it('accepts valid cart item data', () => {
        const result = cartItemBaseSchema.safeParse({ productId: 'prod-1', quantity: 2 })
        expect(result.success).toBe(true)
    })

    it('rejects empty productId', () => {
        const result = cartItemBaseSchema.safeParse({ productId: '', quantity: 1 })
        expect(result.success).toBe(false)
    })

    it('rejects missing productId', () => {
        const result = cartItemBaseSchema.safeParse({ quantity: 1 })
        expect(result.success).toBe(false)
    })

    it('rejects quantity of zero', () => {
        const result = cartItemBaseSchema.safeParse({ productId: 'prod-1', quantity: 0 })
        expect(result.success).toBe(false)
    })

    it('rejects negative quantity', () => {
        const result = cartItemBaseSchema.safeParse({ productId: 'prod-1', quantity: -1 })
        expect(result.success).toBe(false)
    })

    it('rejects non-integer quantity', () => {
        const result = cartItemBaseSchema.safeParse({ productId: 'prod-1', quantity: 1.5 })
        expect(result.success).toBe(false)
    })

    it('rejects string quantity', () => {
        const result = cartItemBaseSchema.safeParse({ productId: 'prod-1', quantity: '2' })
        expect(result.success).toBe(false)
    })
})

describe('cartItemCreateSchema', () => {
    it('is equivalent to cartItemBaseSchema and accepts valid data', () => {
        const result = cartItemCreateSchema.safeParse({ productId: 'prod-1', quantity: 5 })
        expect(result.success).toBe(true)
    })

    it('rejects invalid data', () => {
        const result = cartItemCreateSchema.safeParse({ productId: '', quantity: 0 })
        expect(result.success).toBe(false)
    })
})

describe('cartItemUpdateSchema', () => {
    it('accepts partial data (only quantity)', () => {
        const result = cartItemUpdateSchema.safeParse({ quantity: 3 })
        expect(result.success).toBe(true)
    })

    it('accepts partial data (only productId)', () => {
        const result = cartItemUpdateSchema.safeParse({ productId: 'prod-2' })
        expect(result.success).toBe(true)
    })

    it('accepts empty object (all fields optional)', () => {
        const result = cartItemUpdateSchema.safeParse({})
        expect(result.success).toBe(true)
    })

    it('accepts full data', () => {
        const result = cartItemUpdateSchema.safeParse({ productId: 'prod-1', quantity: 2 })
        expect(result.success).toBe(true)
    })

    it('still rejects non-integer quantity', () => {
        const result = cartItemUpdateSchema.safeParse({ quantity: 1.5 })
        expect(result.success).toBe(false)
    })
})

describe('cartItemParamsSchema', () => {
    it('accepts valid id', () => {
        const result = cartItemParamsSchema.safeParse({ id: 'item-123' })
        expect(result.success).toBe(true)
    })

    it('rejects empty id', () => {
        const result = cartItemParamsSchema.safeParse({ id: '' })
        expect(result.success).toBe(false)
    })

    it('rejects missing id', () => {
        const result = cartItemParamsSchema.safeParse({})
        expect(result.success).toBe(false)
    })
})
