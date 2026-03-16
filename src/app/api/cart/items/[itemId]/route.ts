import { NextRequest } from 'next/server'
import { z } from 'zod'

import { cartService } from '@/services/cart.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

const paramsSchema = z.object({ itemId: z.string().min(1) })
const updateSchema = z.object({ quantity: z.number().int().min(0) })

export const PATCH = withErrorHandler(async (req: NextRequest, context) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { itemId } = paramsSchema.parse(await context.params)
    const { quantity } = updateSchema.parse(await req.json())
    const cart = await cartService.updateItemQuantity(session.user.id, itemId, quantity)

    return ApiResponse.success(cart)
})

export const DELETE = withErrorHandler(async (_req: NextRequest, context) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { itemId } = paramsSchema.parse(await context.params)
    const cart = await cartService.removeItem(session.user.id, itemId)

    return ApiResponse.success(cart)
})
