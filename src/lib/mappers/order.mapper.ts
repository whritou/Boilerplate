import type { OrderDTO, OrderEntity } from '@/types/models/order'

export function mapOrder(dto: OrderDTO): OrderEntity {
    return {
        id: dto.id,
        userId: dto.userId,
        items: (dto.items ?? []).map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
        })),
        totalPrice: dto.totalPrice,
        status: dto.status,
        paymentStatus: dto.paymentStatus,
        stripePaymentIntentId: dto.stripePaymentIntentId ?? undefined,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    }
}

export function mapOrders(dtos: OrderDTO[]): OrderEntity[] {
    return dtos.map(mapOrder)
}
