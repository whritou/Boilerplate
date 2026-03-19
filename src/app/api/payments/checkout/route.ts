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
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
})

const checkLimit = rateLimit({ windowMs: 60_000, max: 10 })

export const POST = withErrorHandler(async (req: NextRequest) => {
    const limited = checkLimit(req)
    if (limited) return limited

    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { orderId, successUrl, cancelUrl } = bodySchema.parse(await req.json())

    const order = await orderService.getById(orderId)
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
        throw new ForbiddenError()
    }

    const checkout = await paymentService.createCheckoutSession(orderId, successUrl, cancelUrl)

    return ApiResponse.success(checkout)
})
