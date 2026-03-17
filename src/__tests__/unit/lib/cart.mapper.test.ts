import { describe, it, expect } from 'vitest'
import { mapCart } from '@/lib/mappers/cart.mapper'
import type { CartDTO } from '@/types/models/cart'

const sampleDTO: CartDTO = {
    id: 'cart-1',
    userId: 'user-1',
    items: [
        {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            price: '29.99',
            product: { id: 'prod-1', name: 'Widget', price: 29.99, imageUrl: null },
        },
        {
            id: 'item-2',
            productId: 'prod-2',
            quantity: 1,
            price: '9.99',
        },
    ],
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-16T12:00:00.000Z',
}

describe('mapCart', () => {
    it('maps all fields from DTO to Entity', () => {
        const entity = mapCart(sampleDTO)
        expect(entity.id).toBe('cart-1')
        expect(entity.userId).toBe('user-1')
        expect(entity.items).toHaveLength(2)
        expect(entity.createdAt).toBeInstanceOf(Date)
        expect(entity.updatedAt).toBeInstanceOf(Date)
    })

    it('maps cart item fields correctly', () => {
        const entity = mapCart(sampleDTO)
        const item = entity.items[0]
        expect(item.id).toBe('item-1')
        expect(item.productId).toBe('prod-1')
        expect(item.quantity).toBe(2)
        expect(item.price).toBe('29.99')
    })

    it('preserves product info when present', () => {
        const entity = mapCart(sampleDTO)
        expect(entity.items[0].product).toBeDefined()
        expect(entity.items[0].product?.name).toBe('Widget')
    })

    it('handles items without product info', () => {
        const entity = mapCart(sampleDTO)
        expect(entity.items[1].product).toBeUndefined()
    })

    it('parses date strings into Date objects', () => {
        const entity = mapCart(sampleDTO)
        expect(entity.createdAt.toISOString()).toBe('2025-01-15T10:00:00.000Z')
        expect(entity.updatedAt.toISOString()).toBe('2025-01-16T12:00:00.000Z')
    })

    it('handles empty items array', () => {
        const dto: CartDTO = { ...sampleDTO, items: [] }
        const entity = mapCart(dto)
        expect(entity.items).toEqual([])
    })
})
