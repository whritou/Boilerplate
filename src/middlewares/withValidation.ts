import { NextRequest } from 'next/server'
import { ZodType } from 'zod'
import { ApiResponse } from '@/utils/apiResponse'

export function withValidation<T>(schema: ZodType<T>) {
    return function (
        handler: (req: NextRequest, validatedData: T, context?: unknown) => Promise<Response>
    ) {
        return async (req: NextRequest, context?: unknown): Promise<Response> => {
            try {
                const body = await req.json()
                const validatedData = schema.parse(body)
                return await handler(req, validatedData, context)
            } catch (err) {
                return ApiResponse.fromError(err)
            }
        }
    }
}
