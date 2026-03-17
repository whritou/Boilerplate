export interface CartItemProduct {
    id: string
    name: string
    imageUrl?: string | null
    price: number
}

export interface CartItemEntity {
    id: string
    productId: string
    quantity: number
    price: string
    product?: CartItemProduct
}

export interface CartItemDTO {
    id: string
    productId: string
    quantity: number
    price: string
    product?: CartItemProduct
}
