import { z } from "zod"

export const cartItemBaseSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
})

export const cartItemCreateSchema = cartItemBaseSchema
export const cartItemUpdateSchema = cartItemBaseSchema.partial()

export const cartItemParamsSchema = z.object({
    id: z.string().min(1, "CartItem ID required"),
})

export type CartItemBase = z.infer<typeof cartItemBaseSchema>
export type CartItemCreate = z.infer<typeof cartItemCreateSchema>
export type CartItemUpdate = z.infer<typeof cartItemUpdateSchema>
export type CartItemParams = z.infer<typeof cartItemParamsSchema>
