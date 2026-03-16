import { NextRequest } from 'next/server'

import { cartService } from '@/services/cart.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

export const POST = withErrorHandler(async (_req: NextRequest) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const cart = await cartService.clear(session.user.id)

    return ApiResponse.success(cart)
})
