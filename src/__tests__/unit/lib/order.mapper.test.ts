import { describe, it, expect } from 'vitest'
import { mapOrder, mapOrders } from '@/lib/mappers/order.mapper'
import type { OrderDTO } from '@/types/models/order'

const sampleDTO: OrderDTO = {
    id: 'order-1',
    userId: 'user-1',
    items: [
        { id: 'oi-1', productId: 'prod-1', quantity: 2, price: '29.99' },
        { id: 'oi-2', productId: 'prod-2', quantity: 1, price: '9.99' },
    ],
    totalPrice: '69.97',
    status: 'pending',
    paymentStatus: 'requires_payment_method',
    stripePaymentIntentId: 'pi_abc123',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-16T12:00:00.000Z',
}

describe('mapOrder', () => {
    it('maps all fields from DTO to Entity', () => {
        const entity = mapOrder(sampleDTO)
        expect(entity.id).toBe('order-1')
        expect(entity.userId).toBe('user-1')
        expect(entity.totalPrice).toBe('69.97')
        expect(entity.status).toBe('pending')
        expect(entity.paymentStatus).toBe('requires_payment_method')
        expect(entity.stripePaymentIntentId).toBe('pi_abc123')
        expect(entity.createdAt).toBeInstanceOf(Date)
        expect(entity.updatedAt).toBeInstanceOf(Date)
    })

    it('maps order items correctly', () => {
        const entity = mapOrder(sampleDTO)
        expect(entity.items).toHaveLength(2)
        expect(entity.items[0].productId).toBe('prod-1')
        expect(entity.items[0].quantity).toBe(2)
        expect(entity.items[0].price).toBe('29.99')
    })

    it('converts null stripePaymentIntentId to undefined', () => {
        const dto: OrderDTO = { ...sampleDTO, stripePaymentIntentId: null }
        const entity = mapOrder(dto)
        expect(entity.stripePaymentIntentId).toBeUndefined()
    })

    it('handles missing stripePaymentIntentId', () => {
        const { stripePaymentIntentId, ...rest } = sampleDTO
        const dto = rest as OrderDTO
        const entity = mapOrder(dto)
        expect(entity.stripePaymentIntentId).toBeUndefined()
    })

    it('parses date strings into Date objects', () => {
        const entity = mapOrder(sampleDTO)
        expect(entity.createdAt.toISOString()).toBe('2025-01-15T10:00:00.000Z')
        expect(entity.updatedAt.toISOString()).toBe('2025-01-16T12:00:00.000Z')
    })
})

describe('mapOrders', () => {
    it('maps an array of DTOs', () => {
        const entities = mapOrders([sampleDTO, { ...sampleDTO, id: 'order-2' }])
        expect(entities).toHaveLength(2)
        expect(entities[0].id).toBe('order-1')
        expect(entities[1].id).toBe('order-2')
    })

    it('returns empty array for empty input', () => {
        expect(mapOrders([])).toEqual([])
    })
})
