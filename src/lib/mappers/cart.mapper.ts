import type { CartDTO, CartEntity } from '@/types/models/cart'

export function mapCart(dto: CartDTO): CartEntity {
    return {
        id: dto.id,
        userId: dto.userId,
        items: dto.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            product: item.product,
        })),
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    }
}
