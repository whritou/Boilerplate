import { describe, it, expect } from 'vitest'
import { jsonResponse, jsonError } from '@/utils/http'

describe('jsonResponse', () => {
    it('returns a Response with status 200 by default', () => {
        const res = jsonResponse({ ok: true })
        expect(res).toBeInstanceOf(Response)
        expect(res.status).toBe(200)
    })

    it('returns the correct JSON body', async () => {
        const res = jsonResponse({ message: 'hello' })
        const body = await res.json()
        expect(body).toEqual({ message: 'hello' })
    })

    it('sets Content-Type to application/json', () => {
        const res = jsonResponse({ ok: true })
        expect(res.headers.get('Content-Type')).toBe('application/json')
    })

    it('uses the provided status code', () => {
        const res = jsonResponse({ created: true }, 201)
        expect(res.status).toBe(201)
    })

    it('serializes arrays correctly', async () => {
        const res = jsonResponse([1, 2, 3])
        const body = await res.json()
        expect(body).toEqual([1, 2, 3])
    })
})

describe('jsonError', () => {
    it('returns a Response with status 400 by default', () => {
        const res = jsonError('Bad input')
        expect(res.status).toBe(400)
    })

    it('returns body with { error: message }', async () => {
        const res = jsonError('Not found')
        const body = await res.json()
        expect(body).toEqual({ error: 'Not found' })
    })

    it('uses the provided status code', () => {
        const res = jsonError('Unauthorized', 401)
        expect(res.status).toBe(401)
    })

    it('sets Content-Type to application/json', () => {
        const res = jsonError('fail')
        expect(res.headers.get('Content-Type')).toBe('application/json')
    })
})
