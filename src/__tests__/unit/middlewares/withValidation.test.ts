import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { withValidation } from '@/middlewares/withValidation'
import { z } from 'zod'

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

function makeJsonRequest(body: unknown, url = 'http://localhost/api/test'): NextRequest {
    return new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

function makeMalformedRequest(url = 'http://localhost/api/test'): NextRequest {
    return new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {{',
    })
}

const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0),
})

describe('withValidation', () => {
    it('calls handler with parsed data when body is valid', async () => {
        const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
        const wrapped = withValidation(testSchema)(handler)

        const req = makeJsonRequest({ name: 'Alice', age: 30 })
        const res = await wrapped(req)

        expect(res.status).toBe(200)
        expect(handler).toHaveBeenCalledOnce()
        const [, validatedData] = handler.mock.calls[0]
        expect(validatedData).toEqual({ name: 'Alice', age: 30 })
    })

    it('passes the request object as the first argument to handler', async () => {
        const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
        const wrapped = withValidation(testSchema)(handler)

        const req = makeJsonRequest({ name: 'Bob', age: 25 })
        await wrapped(req)

        const [passedReq] = handler.mock.calls[0]
        expect(passedReq).toBe(req)
    })

    it('returns 422 when body fails schema validation', async () => {
        const handler = vi.fn()
        const wrapped = withValidation(testSchema)(handler)

        const req = makeJsonRequest({ name: '', age: 25 })
        const res = await wrapped(req)

        expect(res.status).toBe(422)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(handler).not.toHaveBeenCalled()
    })

    it('returns 422 when required field is missing', async () => {
        const handler = vi.fn()
        const wrapped = withValidation(testSchema)(handler)

        const req = makeJsonRequest({ name: 'Alice' })
        const res = await wrapped(req)

        expect(res.status).toBe(422)
        expect(handler).not.toHaveBeenCalled()
    })

    it('returns error response when JSON is malformed', async () => {
        const handler = vi.fn()
        const wrapped = withValidation(testSchema)(handler)

        const req = makeMalformedRequest()
        const res = await wrapped(req)

        // Malformed JSON causes req.json() to throw a SyntaxError which is not
        // an AppError or ZodError, so fromError falls through to 500 INTERNAL_ERROR
        expect(res.status).toBe(500)
        expect(handler).not.toHaveBeenCalled()
    })

    it('passes context through to the handler', async () => {
        const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
        const wrapped = withValidation(testSchema)(handler)

        const req = makeJsonRequest({ name: 'Carol', age: 40 })
        const fakeContext = { params: Promise.resolve({ id: '1' }) }
        await wrapped(req, fakeContext)

        const [, , passedContext] = handler.mock.calls[0]
        expect(passedContext).toBe(fakeContext)
    })

    it('strips extra fields not defined in schema', async () => {
        const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
        const wrapped = withValidation(testSchema)(handler)

        const req = makeJsonRequest({ name: 'Dave', age: 20, extra: 'ignored' })
        await wrapped(req)

        const [, validatedData] = handler.mock.calls[0]
        expect(validatedData).not.toHaveProperty('extra')
    })
})
