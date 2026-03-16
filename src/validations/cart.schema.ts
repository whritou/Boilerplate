import { z } from "zod"
import { cartItemBaseSchema } from "@/validations/cartItem.schema"

export const cartBaseSchema = z.object({
    userId: z.string().min(1),
    items: z.array(cartItemBaseSchema),
})

export const cartCreateSchema = cartBaseSchema
export const cartUpdateSchema = cartBaseSchema.partial()

export const addToCartSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
})

export const cartParamsSchema = z.object({
    id: z.string().min(1, "Cart ID required"),
})

export type CartBase = z.infer<typeof cartBaseSchema>
export type CartCreate = z.infer<typeof cartCreateSchema>
export type CartUpdate = z.infer<typeof cartUpdateSchema>
export type AddToCart = z.infer<typeof addToCartSchema>
export type CartParams = z.infer<typeof cartParamsSchema>
