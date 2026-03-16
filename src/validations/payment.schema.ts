import { z } from "zod"
import { paymentStatusEnum } from "@/validations/order.schema"

export const paymentBaseSchema = z.object({
    orderId: z.string().min(1),
    stripePaymentIntentId: z.string().min(1),
    amount: z.string().min(1),
    status: paymentStatusEnum,
})

export const paymentCreateSchema = paymentBaseSchema
export const paymentUpdateSchema = paymentBaseSchema.partial()

export const paymentParamsSchema = z.object({
    id: z.string().min(1, "Payment ID required"),
})

export type PaymentBase = z.infer<typeof paymentBaseSchema>
export type PaymentCreate = z.infer<typeof paymentCreateSchema>
export type PaymentUpdate = z.infer<typeof paymentUpdateSchema>
export type PaymentParams = z.infer<typeof paymentParamsSchema>
