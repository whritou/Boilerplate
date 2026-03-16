import { createCrudStore } from '@/stores/createCRUD.store'
import {
    mapProducts,
    mapProduct
} from '@/lib/mappers/product.mapper'
import type { ProductEntity } from '@/types/models/product'

export const useProductStore = createCrudStore<ProductEntity>(
    'products',
    mapProduct,
    mapProducts,
)
