import { NextRequest } from 'next/server'
import { z } from 'zod'

import { paymentService } from '@/services/payment.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'
import { orderService } from '@/services/order.service'
import { rateLimit } from '@/middlewares/rateLimit'

const bodySchema = z.object({
    orderId: z.string().min(1),
})

const checkLimit = rateLimit({ windowMs: 60_000, max: 10 })

export const POST = withErrorHandler(async (req: NextRequest) => {
    const limited = await checkLimit(req)
    if (limited) return limited

    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { orderId } = bodySchema.parse(await req.json())

    // Fix #17: Fetch the order once, use for both auth check and payment intent creation
    const order = await orderService.getById(orderId)
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
        throw new ForbiddenError()
    }

    const result = await paymentService.createPaymentIntent(orderId, order)

    return ApiResponse.success(result)
})
