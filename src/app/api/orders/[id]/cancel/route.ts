import { NextRequest } from 'next/server'
import { z } from 'zod'

import { orderService } from '@/services/order.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'
import { rateLimit } from '@/middlewares/rateLimit'

const paramsSchema = z.object({ id: z.string().min(1) })
const cancelLimit = rateLimit({ windowMs: 60_000, max: 10 })

export const POST = withErrorHandler(async (req: NextRequest, context) => {
    const limited = await cancelLimit(req)
    if (limited) return limited

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
