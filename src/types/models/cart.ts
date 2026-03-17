import { CartItemEntity, CartItemDTO } from "@/types/models/cartItem";

export interface CartEntity {
    id: string
    userId: string
    items: CartItemEntity[]
    createdAt: Date
    updatedAt: Date
}

export interface CartDTO {
    id: string
    userId: string
    items: CartItemDTO[]
    createdAt: string
    updatedAt: string
}
