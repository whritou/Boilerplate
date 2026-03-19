import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiResponse } from '@/utils/apiResponse'
import { AppError } from '@/utils/errors'
import { ZodError, z } from 'zod'

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ApiResponse.success', () => {
    it('returns 200 JSON with { success: true, data }', async () => {
        const res = ApiResponse.success({ id: 1 })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ success: true, data: { id: 1 } })
    })

    it('uses the provided status code', async () => {
        const res = ApiResponse.success({ id: 1 }, 202)
        expect(res.status).toBe(202)
    })
})

describe('ApiResponse.created', () => {
    it('returns 201 with success: true and data', async () => {
        const res = ApiResponse.created({ id: 'new-id' })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body).toEqual({ success: true, data: { id: 'new-id' } })
    })
})

describe('ApiResponse.noContent', () => {
    it('returns 204 with null body', async () => {
        const res = ApiResponse.noContent()
        expect(res.status).toBe(204)
        const text = await res.text()
        expect(text).toBe('')
    })
})

describe('ApiResponse.paginated', () => {
    it('returns 200 with data and meta spread at top level', async () => {
        const result = {
            data: [{ id: 1 }, { id: 2 }],
            meta: { total: 2, page: 1, pageSize: 10 },
        }
        const res = ApiResponse.paginated(result)
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({
            success: true,
            data: [{ id: 1 }, { id: 2 }],
            meta: { total: 2, page: 1, pageSize: 10 },
        })
    })
})

describe('ApiResponse.error', () => {
    it('returns given status with { success: false, error: { message } }', async () => {
        const res = ApiResponse.error('Something went wrong', 400)
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error.message).toBe('Something went wrong')
    })

    it('includes code and errors when provided', async () => {
        const res = ApiResponse.error('Bad', 422, 'VALIDATION_ERROR', { field: ['required'] })
        const body = await res.json()
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(body.error.errors).toEqual({ field: ['required'] })
    })

    it('defaults to status 500', async () => {
        const res = ApiResponse.error('fail')
        expect(res.status).toBe(500)
    })
})

describe('ApiResponse.fromError', () => {
    it('handles AppError using its statusCode and message', async () => {
        const err = new AppError('Not found', 404, 'NOT_FOUND')
        const res = ApiResponse.fromError(err)
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error.message).toBe('Not found')
        expect(body.error.code).toBe('NOT_FOUND')
    })

    it('handles ZodError and returns 422 VALIDATION_ERROR', async () => {
        const schema = z.object({ name: z.string().min(1) })
        let zodErr: ZodError | null = null
        try {
            schema.parse({ name: '' })
        } catch (e) {
            zodErr = e as ZodError
        }
        const res = ApiResponse.fromError(zodErr!)
        expect(res.status).toBe(422)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(body.error.message).toBe('Validation failed')
    })

    it('handles unknown error and returns 500 INTERNAL_ERROR', async () => {
        const res = ApiResponse.fromError(new Error('Unexpected'))
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.error.code).toBe('INTERNAL_ERROR')
        expect(body.error.message).toBe('Internal server error')
    })

    it('handles non-Error unknown and returns 500 INTERNAL_ERROR', async () => {
        const res = ApiResponse.fromError('some string error')
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error.code).toBe('INTERNAL_ERROR')
    })
})
