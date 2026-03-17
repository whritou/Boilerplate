import { z } from "zod"
import { orderItemBaseSchema } from "@/validations/orderItem.schema"

export const paymentStatusEnum = z.enum([
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "processing",
    "requires_capture",
    "canceled",
    "succeeded"
])

export const orderStatusEnum = z.enum([
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "canceled"
])

export const orderBaseSchema = z.object({
    userId: z.string().min(1),
    items: z.array(orderItemBaseSchema).min(1),
    totalPrice: z.string().min(1),
    status: orderStatusEnum,
    paymentStatus: paymentStatusEnum,
    stripePaymentIntentId: z.string().optional(),
})

export const orderCreateSchema = orderBaseSchema
export const orderUpdateSchema = orderBaseSchema.partial()

export const orderParamsSchema = z.object({
    id: z.string().min(1),
})

export const shippingAddressSchema = z.object({
    shippingFirstName: z.string().min(1, "First name is required"),
    shippingLastName: z.string().min(1, "Last name is required"),
    shippingStreet: z.string().min(1, "Street is required"),
    shippingCity: z.string().min(1, "City is required"),
    shippingZipCode: z.string().min(1, "Zip code is required"),
    shippingCountry: z.string().min(1, "Country is required"),
    shippingPhone: z.string().optional(),
})

export type OrderBase = z.infer<typeof orderBaseSchema>
export type OrderCreate = z.infer<typeof orderCreateSchema>
export type OrderUpdate = z.infer<typeof orderUpdateSchema>
export type OrderParams = z.infer<typeof orderParamsSchema>
export type ShippingAddress = z.infer<typeof shippingAddressSchema>
