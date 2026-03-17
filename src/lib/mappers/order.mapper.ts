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
            product: item.product,
        })),
        totalPrice: dto.totalPrice,
        status: dto.status,
        paymentStatus: dto.paymentStatus,
        stripePaymentIntentId: dto.stripePaymentIntentId ?? undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        shippingFirstName: dto.shippingFirstName ?? null,
        shippingLastName: dto.shippingLastName ?? null,
        shippingStreet: dto.shippingStreet ?? null,
        shippingCity: dto.shippingCity ?? null,
        shippingZipCode: dto.shippingZipCode ?? null,
        shippingCountry: dto.shippingCountry ?? null,
        shippingPhone: dto.shippingPhone ?? null,
        user: dto.user ? { id: dto.user.id, name: dto.user.name, email: dto.user.email } : undefined,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    }
}

export function mapOrders(dtos: OrderDTO[]): OrderEntity[] {
    return dtos.map(mapOrder)
}
