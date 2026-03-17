import { describe, it, expect } from 'vitest'
import { mapProduct, mapProducts } from '@/lib/mappers/product.mapper'
import type { ProductDTO } from '@/types/models/product'

const sampleDTO: ProductDTO = {
    id: 'prod-1',
    name: 'Widget',
    description: 'A nice widget',
    imageUrl: 'https://example.com/img.jpg',
    price: 29.99,
    quantity: 50,
    isArchived: false,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-16T12:00:00.000Z',
}

describe('mapProduct', () => {
    it('maps all fields from DTO to Entity', () => {
        const entity = mapProduct(sampleDTO)
        expect(entity.id).toBe('prod-1')
        expect(entity.name).toBe('Widget')
        expect(entity.description).toBe('A nice widget')
        expect(entity.imageUrl).toBe('https://example.com/img.jpg')
        expect(entity.price).toBe(29.99)
        expect(entity.quantity).toBe(50)
        expect(entity.isArchived).toBe(false)
        expect(entity.createdAt).toBeInstanceOf(Date)
        expect(entity.updatedAt).toBeInstanceOf(Date)
    })

    it('converts null description to undefined', () => {
        const dto: ProductDTO = { ...sampleDTO, description: null }
        const entity = mapProduct(dto)
        expect(entity.description).toBeUndefined()
    })

    it('converts null imageUrl to undefined', () => {
        const dto: ProductDTO = { ...sampleDTO, imageUrl: null }
        const entity = mapProduct(dto)
        expect(entity.imageUrl).toBeUndefined()
    })

    it('parses date strings into Date objects', () => {
        const entity = mapProduct(sampleDTO)
        expect(entity.createdAt.toISOString()).toBe('2025-01-15T10:00:00.000Z')
        expect(entity.updatedAt.toISOString()).toBe('2025-01-16T12:00:00.000Z')
    })
})

describe('mapProducts', () => {
    it('maps an array of DTOs', () => {
        const entities = mapProducts([sampleDTO, { ...sampleDTO, id: 'prod-2' }])
        expect(entities).toHaveLength(2)
        expect(entities[0].id).toBe('prod-1')
        expect(entities[1].id).toBe('prod-2')
    })

    it('returns empty array for empty input', () => {
        expect(mapProducts([])).toEqual([])
    })
})
