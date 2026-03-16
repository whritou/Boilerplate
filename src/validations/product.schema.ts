import { z } from "zod"

export const productBaseSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(100)
        .trim(),

    description: z
        .string()
        .max(500)
        .optional()
        .nullable(),

    imageUrl: z
        .string()
        .url("Invalid image URL")
        .optional()
        .nullable(),

    price: z
        .number()
        .min(0, "Price required"),

    quantity: z
        .number()
        .int()
        .min(0, "Quantity must be >= 0"),

    isArchived: z
        .boolean()
        .optional(),
})

export const productCreateSchema = productBaseSchema

export const productUpdateSchema = productBaseSchema.partial()

export const productParamsSchema = z.object({
    id: z.string().min(1, "Product ID required"),
})

export type ProductBase = z.infer<typeof productBaseSchema>
export type ProductCreate = z.infer<typeof productCreateSchema>
export type ProductUpdate = z.infer<typeof productUpdateSchema>
export type ProductParams = z.infer<typeof productParamsSchema>