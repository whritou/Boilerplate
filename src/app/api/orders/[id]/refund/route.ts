import { NextRequest } from 'next/server'
import { z } from 'zod'

import { orderService } from '@/services/order.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * POST /api/orders/[id]/refund
 * Admin-only: cancels the order and issues a full Stripe refund.
 */
export const POST = withErrorHandler(async (_req: NextRequest, context) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)
    const order = await orderService.cancelAndRefund(id)

    return ApiResponse.success(order)
})
