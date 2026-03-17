import { NextRequest } from 'next/server'
import { z } from 'zod'

import { paymentService } from '@/services/payment.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'
import { orderService } from '@/services/order.service'

const bodySchema = z.object({
    orderId: z.string().min(1),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { orderId } = bodySchema.parse(await req.json())

    const order = await orderService.getById(orderId)
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
        throw new ForbiddenError()
    }

    const result = await paymentService.createPaymentIntent(orderId)

    return ApiResponse.success(result)
})
