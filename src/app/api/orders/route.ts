import { NextRequest } from 'next/server'

import { orderService } from '@/services/order.service'
import { parseQueryParams } from '@/lib/query/parseQueryParams'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

export const GET = withErrorHandler(async (req: NextRequest) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const params = parseQueryParams(req.nextUrl.searchParams)

    if (session.user.role !== 'ADMIN') {
        params.extraWhere = { userId: session.user.id }
    }

    const result = await orderService.getAll(params)
    return ApiResponse.paginated(result)
})

export const POST = withErrorHandler(async (_req: NextRequest) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const order = await orderService.createFromCart(session.user.id)

    return ApiResponse.created(order)
})
