import { describe, it, expect } from 'vitest'
import { productCreateSchema } from '@/validations/product.schema'
import { mapProduct, mapProducts } from '@/lib/mappers/product.mapper'
import type { ProductDTO } from '@/types/models/product'

const sampleDTO: ProductDTO = {
    id: 'prod-1',
    name: 'Widget',
    description: 'A widget',
    imageUrl: 'https://example.com/img.jpg',
    price: 29.99,
    quantity: 50,
    isArchived: false,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-16T12:00:00.000Z',
}

describe('Performance: Product validation', () => {
    it('validates 10,000 products under 500ms', () => {
        const data = { name: 'Test Product', price: '29.99', quantity: 10 }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            productCreateSchema.safeParse(data)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(500)
    })
})

describe('Performance: Product mapper', () => {
    it('maps 10,000 products under 100ms', () => {
        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            mapProduct(sampleDTO)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(100)
    })

    it('maps array of 1,000 products under 50ms', () => {
        const dtos = Array.from({ length: 1_000 }, (_, i) => ({
            ...sampleDTO,
            id: `prod-${i}`,
        }))

        const start = performance.now()
        mapProducts(dtos)
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(50)
    })
})
