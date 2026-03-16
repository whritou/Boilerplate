import { z } from "zod"

export const orderItemBaseSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    price: z.string().min(1)
})
