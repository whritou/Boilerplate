import { NextRequest } from 'next/server'
import { ApiResponse } from '@/utils/apiResponse'

type RouteContext = {
    params: Promise<Record<string, string>>
}

type RouteHandler = (
    req: NextRequest,
    context: RouteContext
) => Promise<Response>

export function withErrorHandler(handler: RouteHandler): RouteHandler {
    return async (req, context) => {
        try {
            return await handler(req, context)
        } catch (err) {
            return ApiResponse.fromError(err)
        }
    }
}

export function compose(
    ...middlewares: Array<(handler: RouteHandler) => RouteHandler>
) {
    return (handler: RouteHandler): RouteHandler =>
        middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
}