import { createCrudStore } from '@/stores/createCRUD.store'
import { mapOrder, mapOrders } from '@/lib/mappers/order.mapper'
import type { OrderEntity } from '@/types/models/order'

export const useOrderStore = createCrudStore<OrderEntity>(
    'orders',
    mapOrder,
    mapOrders,
)
