import { NextRequest } from 'next/server'

import { cartService } from '@/services/cart.service'
import { addToCartSchema } from '@/validations/cart.schema'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

export const POST = withErrorHandler(async (req: NextRequest) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { productId, quantity } = addToCartSchema.parse(await req.json())
    const cart = await cartService.addItem(session.user.id, productId, quantity)

    return ApiResponse.success(cart)
})
