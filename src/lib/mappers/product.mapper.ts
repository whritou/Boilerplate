import type { ProductDTO, ProductEntity } from '@/types/models/product'

export function mapProduct(dto: ProductDTO): ProductEntity {
    return {
        id:          dto.id,
        name:        dto.name,
        description: dto.description ?? undefined,
        imageUrl:    dto.imageUrl ?? undefined,
        price:       dto.price,
        quantity:    dto.quantity,
        isArchived:  dto.isArchived,
        createdAt:   new Date(dto.createdAt),
        updatedAt:   new Date(dto.updatedAt),
    }
}

export function mapProducts(dtos: ProductDTO[]): ProductEntity[] {
    return dtos.map(mapProduct)
}
