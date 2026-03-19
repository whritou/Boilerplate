import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        order: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
            count: vi.fn(),
        },
        orderItem: {
            createMany: vi.fn(),
        },
    },
}))

import { orderRepository } from '@/repositories/order.repository'
import { prisma } from '@/lib/db/prisma'

const mockPrisma = prisma as any

beforeEach(() => {
    vi.clearAllMocks()
})

describe('OrderRepository (base methods)', () => {
    it('findMany delegates to model.findMany and count', async () => {
        mockPrisma.order.findMany.mockResolvedValue([])
        mockPrisma.order.count.mockResolvedValue(0)

        const result = await orderRepository.findMany({})
        expect(mockPrisma.order.findMany).toHaveBeenCalled()
        expect(result.data).toEqual([])
    })

    it('findById delegates to model.findUnique', async () => {
        const order = { id: 'ord-1' }
        mockPrisma.order.findUnique.mockResolvedValue(order)

        const result = await orderRepository.findById('ord-1')
        expect(result).toEqual(order)
    })
})

describe('OrderRepository.findWithDetails', () => {
    it('finds order by id with items and payment', async () => {
        const expected = { id: 'ord-1', items: [], payment: null }
        mockPrisma.order.findUnique.mockResolvedValue(expected)

        const result = await orderRepository.findWithDetails('ord-1')

        expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'ord-1' },
                include: expect.objectContaining({
                    items: expect.anything(),
                    payment: true,
                }),
            }),
        )
        expect(result).toEqual(expected)
    })

    it('returns null when not found', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(null)
        const result = await orderRepository.findWithDetails('missing')
        expect(result).toBeNull()
    })
})

describe('OrderRepository.findByStripePaymentIntentId', () => {
    it('finds order by stripePaymentIntentId', async () => {
        const expected = { id: 'ord-1', stripePaymentIntentId: 'pi_123' }
        mockPrisma.order.findFirst.mockResolvedValue(expected)

        const result = await orderRepository.findByStripePaymentIntentId('pi_123')

        expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { stripePaymentIntentId: 'pi_123' } }),
        )
        expect(result).toEqual(expected)
    })

    it('returns null when no matching payment intent', async () => {
        mockPrisma.order.findFirst.mockResolvedValue(null)
        const result = await orderRepository.findByStripePaymentIntentId('pi_unknown')
        expect(result).toBeNull()
    })
})

describe('OrderRepository.updateStatus', () => {
    it('updates order status', async () => {
        const updated = { id: 'ord-1', status: 'confirmed' }
        mockPrisma.order.update.mockResolvedValue(updated)

        const result = await orderRepository.updateStatus('ord-1', 'confirmed')

        expect(mockPrisma.order.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'ord-1' },
                data: { status: 'confirmed' },
            }),
        )
        expect(result).toEqual(updated)
    })
})

describe('OrderRepository.updatePaymentStatus', () => {
    it('updates payment status', async () => {
        const updated = { id: 'ord-1', paymentStatus: 'succeeded' }
        mockPrisma.order.update.mockResolvedValue(updated)

        const result = await orderRepository.updatePaymentStatus('ord-1', 'succeeded')

        expect(mockPrisma.order.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'ord-1' },
                data: { paymentStatus: 'succeeded' },
            }),
        )
        expect(result).toEqual(updated)
    })
})

describe('OrderRepository.findByUserId', () => {
    it('finds orders for a user ordered by createdAt desc', async () => {
        const orders = [{ id: 'ord-1' }, { id: 'ord-2' }]
        mockPrisma.order.findMany.mockResolvedValue(orders)

        const result = await orderRepository.findByUserId('user-1')

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-1' },
                orderBy: { createdAt: 'desc' },
            }),
        )
        expect(result).toEqual(orders)
    })
})

describe('OrderRepository.createWithItems', () => {
    it('creates order with items', async () => {
        const created = { id: 'ord-new', totalPrice: 29.99, items: [{ productId: 'prod-1', quantity: 2, price: 14.99 }] }
        mockPrisma.order.create.mockResolvedValue(created)

        const result = await orderRepository.createWithItems({
            userId: 'user-1',
            totalPrice: 29.99,
            paymentStatus: 'requires_payment_method',
            items: [{ productId: 'prod-1', quantity: 2, price: 14.99 }],
        })

        expect(mockPrisma.order.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'user-1',
                    totalPrice: 29.99,
                    items: { create: [{ productId: 'prod-1', quantity: 2, price: 14.99 }] },
                }),
                include: { items: true },
            }),
        )
        expect(result).toEqual(created)
    })
})

describe('OrderRepository.findExpiredUnpaid', () => {
    it('returns expired unpaid orders', async () => {
        const expired = [{ id: 'ord-expired', status: 'pending' }]
        mockPrisma.order.findMany.mockResolvedValue(expired)

        const result = await orderRepository.findExpiredUnpaid()

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: 'pending',
                    paymentStatus: { notIn: ['succeeded', 'processing'] },
                    expiresAt: expect.objectContaining({ not: null }),
                }),
                include: { items: true },
            }),
        )
        expect(result).toEqual(expired)
    })
})
