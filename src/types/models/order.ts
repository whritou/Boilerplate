import { paymentStatusEnum, orderStatusEnum } from "@/validations/order.schema"
import { OrderItemEntity, OrderItemDTO } from "@/types/models/orderItem"
import { z } from "zod"

export type PaymentStatus = z.infer<typeof paymentStatusEnum>
export type OrderStatus = z.infer<typeof orderStatusEnum>

export interface OrderEntity {
    id: string
    userId: string
    items: OrderItemEntity[]
    totalPrice: string
    status: OrderStatus
    paymentStatus: PaymentStatus
    stripePaymentIntentId?: string
    expiresAt?: Date
    createdAt: Date
    updatedAt: Date
}

export interface OrderDTO {
    id: string
    userId: string
    items: OrderItemDTO[]
    totalPrice: string
    status: OrderStatus
    paymentStatus: PaymentStatus
    stripePaymentIntentId?: string | null
    expiresAt?: string | null
    createdAt: string
    updatedAt: string
}
