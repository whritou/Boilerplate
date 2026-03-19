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
    shippingFirstName: 'John',
    shippingLastName: 'Doe',
    shippingStreet: '123 Main St',
    shippingCity: 'Paris',
    shippingZipCode: '75001',
    shippingCountry: 'France',
    shippingPhone: '+33612345678',
    user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
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

    it('maps shipping address fields', () => {
        const entity = mapOrder(sampleDTO)
        expect(entity.shippingFirstName).toBe('John')
        expect(entity.shippingLastName).toBe('Doe')
        expect(entity.shippingStreet).toBe('123 Main St')
        expect(entity.shippingCity).toBe('Paris')
        expect(entity.shippingZipCode).toBe('75001')
        expect(entity.shippingCountry).toBe('France')
        expect(entity.shippingPhone).toBe('+33612345678')
    })

    it('maps null shipping fields to null', () => {
        const dto: OrderDTO = {
            ...sampleDTO,
            shippingFirstName: null,
            shippingLastName: null,
            shippingStreet: null,
            shippingCity: null,
            shippingZipCode: null,
            shippingCountry: null,
            shippingPhone: null,
            user: undefined,
        }
        const entity = mapOrder(dto)
        expect(entity.shippingFirstName).toBeNull()
        expect(entity.shippingCity).toBeNull()
        expect(entity.user).toBeUndefined()
    })

    it('maps user relation when present', () => {
        const entity = mapOrder(sampleDTO)
        expect(entity.user).toEqual({
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
        })
    })

    it('maps user as undefined when not present', () => {
        const dto: OrderDTO = { ...sampleDTO, user: undefined }
        const entity = mapOrder(dto)
        expect(entity.user).toBeUndefined()
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
