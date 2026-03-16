export interface ProductEntity {
    id: string
    name: string
    description?: string
    imageUrl?: string
    price: number
    quantity: number
    isArchived: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt?: Date | null
}

export interface ProductDTO {
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    price: number
    quantity: number
    isArchived: boolean
    createdAt: string
    updatedAt: string
}
