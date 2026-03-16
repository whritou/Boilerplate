import { describe, it, expect } from 'vitest'
import { productCreateSchema, productUpdateSchema, productParamsSchema } from '@/validations/product.schema'

describe('productCreateSchema', () => {
    it('accepts valid product data', () => {
        const data = { name: 'Test Product', price: 29.99, quantity: 10 }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(true)
    })

    it('accepts optional fields', () => {
        const data = {
            name: 'Test',
            price: 10,
            quantity: 0,
            description: 'A description',
            imageUrl: 'https://example.com/img.jpg',
            isArchived: true,
        }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(true)
    })

    it('rejects name shorter than 2 chars', () => {
        const data = { name: 'A', price: 10, quantity: 1 }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(false)
    })

    it('rejects missing price', () => {
        const data = { name: 'Test', quantity: 1 }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(false)
    })

    it('rejects negative quantity', () => {
        const data = { name: 'Test', price: 10, quantity: -1 }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(false)
    })

    it('rejects invalid imageUrl', () => {
        const data = { name: 'Test', price: 10, quantity: 1, imageUrl: 'not-a-url' }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(false)
    })

    it('allows null description and imageUrl', () => {
        const data = { name: 'Test', price: 10, quantity: 0, description: null, imageUrl: null }
        const result = productCreateSchema.safeParse(data)
        expect(result.success).toBe(true)
    })
})

describe('productUpdateSchema', () => {
    it('accepts partial updates', () => {
        const result = productUpdateSchema.safeParse({ name: 'Updated' })
        expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
        const result = productUpdateSchema.safeParse({})
        expect(result.success).toBe(true)
    })

    it('still validates individual fields', () => {
        const result = productUpdateSchema.safeParse({ name: 'A' })
        expect(result.success).toBe(false)
    })
})

describe('productParamsSchema', () => {
    it('accepts valid id', () => {
        const result = productParamsSchema.safeParse({ id: 'clx123' })
        expect(result.success).toBe(true)
    })

    it('rejects empty id', () => {
        const result = productParamsSchema.safeParse({ id: '' })
        expect(result.success).toBe(false)
    })
})
