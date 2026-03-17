import { NextRequest } from 'next/server'
import { z } from 'zod'

import { orderService } from '@/services/order.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

const paramsSchema = z.object({ id: z.string().min(1) })

export const POST = withErrorHandler(async (_req: NextRequest, context) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)
    const order = await orderService.getById(id)

    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
        throw new ForbiddenError()
    }

    const canceled = await orderService.cancel(id)

    return ApiResponse.success(canceled)
})
