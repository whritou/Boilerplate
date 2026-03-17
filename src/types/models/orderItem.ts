export interface OrderItemProduct {
    id: string
    name: string
    imageUrl?: string | null
    price: number
}

export interface OrderItemEntity {
    id: string
    productId: string
    quantity: number
    price: string
    product?: OrderItemProduct
}

export interface OrderItemDTO {
    id: string
    productId: string
    quantity: number
    price: string
    product?: OrderItemProduct
}
