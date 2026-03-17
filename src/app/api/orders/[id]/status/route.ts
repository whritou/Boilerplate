import { NextRequest } from 'next/server'
import { z } from 'zod'

import { orderService } from '@/services/order.service'
import { orderStatusEnum } from '@/validations/order.schema'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({ status: orderStatusEnum })

export const PATCH = withErrorHandler(async (req: NextRequest, context) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)
    const { status } = bodySchema.parse(await req.json())
    const order = await orderService.updateStatus(id, status)

    return ApiResponse.success(order)
})
