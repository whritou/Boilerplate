import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: vi.fn(),
    requireUser: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
    userService: {
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}))

import { requireAdmin, requireUser } from '@/lib/auth/requireAdmin'
import { userService } from '@/services/user.service'
import { GET as getUsers } from '@/app/api/users/route'
import { GET as getUserById, PATCH as patchUser, DELETE as deleteUser } from '@/app/api/users/[id]/route'
import { NextRequest } from 'next/server'

const mockRequireAdmin = requireAdmin as any
const mockRequireUser = requireUser as any
const mockService = userService as any

beforeEach(() => {
    vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------

describe('GET /api/users', () => {
    const makeRequest = () =>
        new NextRequest(new URL('http://localhost:3000/api/users'))

    it('returns 403 when caller is not an admin', async () => {
        mockRequireAdmin.mockResolvedValue(null)

        const res = await getUsers(makeRequest(), { params: Promise.resolve({}) })

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 200 with paginated users for admin', async () => {
        mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockService.getAll.mockResolvedValue({
            data: [{ id: 'user-1' }, { id: 'user-2' }],
            meta: { total: 2, page: 1, limit: 10 },
        })

        const res = await getUsers(makeRequest(), { params: Promise.resolve({}) })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data).toHaveLength(2)
        expect(json.meta).toBeDefined()
    })
})

// ---------------------------------------------------------------------------
// GET /api/users/[id]
// ---------------------------------------------------------------------------

describe('GET /api/users/[id]', () => {
    const makeRequest = () =>
        new NextRequest(new URL('http://localhost:3000/api/users/user-1'))

    const makeContext = (id = 'user-1') => ({ params: Promise.resolve({ id }) })

    it('returns 403 when unauthenticated', async () => {
        mockRequireUser.mockResolvedValue(null)

        const res = await getUserById(makeRequest(), makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 200 when a user requests their own profile', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        mockService.getById.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

        const res = await getUserById(makeRequest(), makeContext('user-1'))

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.id).toBe('user-1')
    })

    it('returns 403 when a user requests another user\'s profile', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = new NextRequest(new URL('http://localhost:3000/api/users/user-99'))
        const res = await getUserById(req, makeContext('user-99'))

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(mockService.getById).not.toHaveBeenCalled()
    })

    it('returns 200 when an admin requests any user\'s profile', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockService.getById.mockResolvedValue({ id: 'user-99', email: 'other@example.com' })

        const req = new NextRequest(new URL('http://localhost:3000/api/users/user-99'))
        const res = await getUserById(req, makeContext('user-99'))

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.id).toBe('user-99')
    })
})

// ---------------------------------------------------------------------------
// PATCH /api/users/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/users/[id]', () => {
    const makeRequest = (body: object) =>
        new NextRequest(new URL('http://localhost:3000/api/users/user-1'), {
            method: 'PATCH',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })

    const makeContext = (id = 'user-1') => ({ params: Promise.resolve({ id }) })

    it('returns 200 when a user updates their own profile', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })
        const updated = { id: 'user-1', name: 'Updated Name' }
        mockService.update.mockResolvedValue(updated)

        const res = await patchUser(makeRequest({ name: 'Updated Name' }), makeContext('user-1'))

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.name).toBe('Updated Name')
        expect(mockService.update).toHaveBeenCalledWith('user-1', { name: 'Updated Name' })
    })

    it('returns 403 when a user tries to update another user\'s profile', async () => {
        mockRequireUser.mockResolvedValue({ user: { id: 'user-1', role: 'USER' } })

        const req = new NextRequest(new URL('http://localhost:3000/api/users/user-99'), {
            method: 'PATCH',
            body: JSON.stringify({ name: 'Hacked' }),
            headers: { 'Content-Type': 'application/json' },
        })
        const res = await patchUser(req, makeContext('user-99'))

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(mockService.update).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// DELETE /api/users/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/users/[id]', () => {
    const makeRequest = () =>
        new NextRequest(new URL('http://localhost:3000/api/users/user-1'), { method: 'DELETE' })

    const makeContext = (id = 'user-1') => ({ params: Promise.resolve({ id }) })

    it('returns 403 when caller is not an admin', async () => {
        mockRequireAdmin.mockResolvedValue(null)

        const res = await deleteUser(makeRequest(), makeContext())

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
        expect(mockService.delete).not.toHaveBeenCalled()
    })

    it('returns 204 when admin deletes a user', async () => {
        mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
        mockService.delete.mockResolvedValue(undefined)

        const res = await deleteUser(makeRequest(), makeContext('user-1'))

        expect(res.status).toBe(204)
        expect(mockService.delete).toHaveBeenCalledWith('user-1')
    })
})
