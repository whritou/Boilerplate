import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { withErrorHandler, compose } from '@/middlewares/withErrorHandler'
import { AppError, NotFoundError } from '@/utils/errors'
import { z } from 'zod'

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

function makeRequest(url = 'http://localhost/api/test'): NextRequest {
    return new NextRequest(url)
}

const fakeContext = { params: Promise.resolve({}) }

describe('withErrorHandler', () => {
    it('passes through a normal handler response', async () => {
        const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
        const wrapped = withErrorHandler(handler)
        const req = makeRequest()
        const res = await wrapped(req, fakeContext)
        expect(res.status).toBe(200)
        expect(handler).toHaveBeenCalledWith(req, fakeContext)
    })

    it('catches AppError and returns correct status', async () => {
        const handler = vi.fn().mockRejectedValue(new NotFoundError('Item not found'))
        const wrapped = withErrorHandler(handler)
        const res = await wrapped(makeRequest(), fakeContext)
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error.message).toBe('Item not found')
        expect(body.error.code).toBe('NOT_FOUND')
    })

    it('catches a generic AppError with custom statusCode', async () => {
        const handler = vi.fn().mockRejectedValue(new AppError('Custom error', 409, 'CONFLICT'))
        const wrapped = withErrorHandler(handler)
        const res = await wrapped(makeRequest(), fakeContext)
        expect(res.status).toBe(409)
        const body = await res.json()
        expect(body.error.code).toBe('CONFLICT')
    })

    it('catches ZodError and returns 422', async () => {
        const schema = z.object({ name: z.string().min(1) })
        const handler = vi.fn().mockImplementation(() => {
            schema.parse({ name: '' })
            return new Response('ok')
        })
        const wrapped = withErrorHandler(handler)
        const res = await wrapped(makeRequest(), fakeContext)
        expect(res.status).toBe(422)
        const body = await res.json()
        expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('catches unknown Error and returns 500', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('Unexpected crash'))
        const wrapped = withErrorHandler(handler)
        const res = await wrapped(makeRequest(), fakeContext)
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error.code).toBe('INTERNAL_ERROR')
    })

    it('catches non-Error throws and returns 500', async () => {
        const handler = vi.fn().mockRejectedValue('string error')
        const wrapped = withErrorHandler(handler)
        const res = await wrapped(makeRequest(), fakeContext)
        expect(res.status).toBe(500)
    })
})

describe('compose', () => {
    it('applies a single middleware', async () => {
        const order: string[] = []
        const middleware = (handler: any) => async (req: any, ctx: any) => {
            order.push('middleware')
            return handler(req, ctx)
        }
        const handler = vi.fn().mockImplementation(async () => {
            order.push('handler')
            return new Response('ok')
        })
        const composed = compose(middleware)(handler)
        await composed(makeRequest(), fakeContext)
        expect(order).toEqual(['middleware', 'handler'])
    })

    it('applies middlewares in outer-first order', async () => {
        const order: string[] = []

        const middlewareA = (handler: any) => async (req: any, ctx: any) => {
            order.push('A-before')
            const res = await handler(req, ctx)
            order.push('A-after')
            return res
        }
        const middlewareB = (handler: any) => async (req: any, ctx: any) => {
            order.push('B-before')
            const res = await handler(req, ctx)
            order.push('B-after')
            return res
        }
        const handler = vi.fn().mockImplementation(async () => {
            order.push('handler')
            return new Response('ok')
        })

        // compose(A, B) means A wraps B wraps handler → A is outermost
        const composed = compose(middlewareA, middlewareB)(handler)
        await composed(makeRequest(), fakeContext)
        expect(order).toEqual(['A-before', 'B-before', 'handler', 'B-after', 'A-after'])
    })

    it('composed handler works end-to-end with withErrorHandler', async () => {
        const handler = vi.fn().mockRejectedValue(new NotFoundError())
        const composed = compose(withErrorHandler)(handler)
        const res = await composed(makeRequest(), fakeContext)
        expect(res.status).toBe(404)
    })
})
