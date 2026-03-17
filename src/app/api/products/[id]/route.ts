import { NextRequest } from 'next/server'

import { productService } from '@/services/product.service'
import { productUpdateSchema, productParamsSchema } from '@/validations/product.schema'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

export const GET = withErrorHandler(async (_req: NextRequest, context) => {
    const { id } = productParamsSchema.parse(await context.params)
    const product = await productService.getById(id)

    return ApiResponse.success(product)
})

export const PATCH = withErrorHandler(async (req: NextRequest, context) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const { id } = productParamsSchema.parse(await context.params)
    const { price, ...rest } = productUpdateSchema.parse(await req.json())
    const product = await productService.update(id, {
        ...rest,
        ...(price !== undefined ? { price } : {}),
    })

    return ApiResponse.success(product)
})

export const DELETE = withErrorHandler(async (_req: NextRequest, context) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const { id } = productParamsSchema.parse(await context.params)
    await productService.delete(id)

    return ApiResponse.noContent()
})
