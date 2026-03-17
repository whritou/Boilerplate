import { NextRequest } from 'next/server'
import { z } from 'zod'

import { userService } from '@/services/user.service'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireUser, requireAdmin } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

const paramsSchema = z.object({ id: z.string().min(1) })

export const GET = withErrorHandler(async (_req: NextRequest, context) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)

    if (session.user.id !== id && session.user.role !== 'ADMIN') {
        throw new ForbiddenError()
    }

    const user = await userService.getById(id)

    return ApiResponse.success(user)
})

export const PATCH = withErrorHandler(async (req: NextRequest, context) => {
    const session = await requireUser()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)

    if (session.user.id !== id && session.user.role !== 'ADMIN') {
        throw new ForbiddenError()
    }

    const data = await req.json()
    const user = await userService.update(id, data)

    return ApiResponse.success(user)
})

export const DELETE = withErrorHandler(async (_req: NextRequest, context) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const { id } = paramsSchema.parse(await context.params)
    await userService.delete(id)

    return ApiResponse.noContent()
})
