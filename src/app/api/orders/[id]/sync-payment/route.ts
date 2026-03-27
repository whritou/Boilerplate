import { NextRequest } from 'next/server'
import { z } from 'zod'

import { paymentService } from '@/services/payment.service'
import { orderService } from '@/services/order.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'
import { rateLimit } from '@/middlewares/rateLimit'

const paramsSchema = z.object({ id: z.string().min(1) })
const checkLimit = rateLimit({ windowMs: 60_000, max: 5 })

/**
 * POST /api/orders/[id]/sync-payment
 * Checks the Stripe PaymentIntent status and syncs it to the order.
 * Called after the user returns from Stripe payment confirmation.
 */
export const POST = withErrorHandler(async (_req: NextRequest, context) => {
    const limited = await checkLimit(_req)
    if (limited) return limited

    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)
    const order = await orderService.getById(id)

    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
        throw new ForbiddenError()
    }

    const updatedOrder = await paymentService.syncPaymentStatus(id)

    return ApiResponse.success(updatedOrder)
})
