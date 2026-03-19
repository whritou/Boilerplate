import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/user.service', () => ({
    userService: {
        verifyPassword: vi.fn(),
        getByEmail: vi.fn(),
        create: vi.fn(),
    },
}))

vi.mock('@/services/auth.service', () => ({
    authService: {
        createSession: vi.fn(),
        createEmailToken: vi.fn(),
        verifyEmailToken: vi.fn(),
        markEmailVerified: vi.fn(),
        consumeToken: vi.fn(),
    },
}))

vi.mock('@/services/mail.service', () => ({
    mailService: {
        sendVerificationEmail: vi.fn(),
    },
}))

import { userService } from '@/services/user.service'
import { authService } from '@/services/auth.service'
import { mailService } from '@/services/mail.service'
import { POST as loginPOST } from '@/app/api/auth/login/route'
import { POST as registerPOST } from '@/app/api/auth/register/route'
import { GET as verifyEmailGET } from '@/app/api/auth/verify-email/route'
import { POST as resendVerificationPOST } from '@/app/api/auth/resend-verification/route'
import { NextRequest } from 'next/server'

const mockUserService = userService as any
const mockAuthService = authService as any
const mockMailService = mailService as any

beforeEach(() => {
    vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
    const makeRequest = (body: object) =>
        new NextRequest(new URL('http://localhost:3000/api/auth/login'), {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })

    it('returns 401 when credentials are invalid (verifyPassword returns null)', async () => {
        mockUserService.verifyPassword.mockResolvedValue(null)

        const req = makeRequest({ email: 'user@example.com', password: 'wrongpassword' })
        const res = await loginPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(401)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 403 when email is not verified', async () => {
        mockUserService.verifyPassword.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: null,
        })

        const req = makeRequest({ email: 'user@example.com', password: 'password123' })
        const res = await loginPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 200 and sets session cookie on success', async () => {
        const fakeUser = { id: 'user-1', email: 'user@example.com', emailVerified: new Date() }
        mockUserService.verifyPassword.mockResolvedValue(fakeUser)
        mockAuthService.createSession.mockResolvedValue({
            token: 'session-token-abc',
            cookieOptions: { httpOnly: true, path: '/' },
        })

        const req = makeRequest({ email: 'user@example.com', password: 'password123' })
        const res = await loginPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        const cookieHeader = res.headers.get('set-cookie')
        expect(cookieHeader).toContain('next-auth.session-token')
    })

    it('returns 422 when body fails schema validation', async () => {
        const req = makeRequest({ email: 'not-an-email', password: 'pw' })
        const res = await loginPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(422)
    })
})

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
    const makeRequest = (body: object) =>
        new NextRequest(new URL('http://localhost:3000/api/auth/register'), {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })

    it('returns 201 with success message on valid body', async () => {
        mockUserService.create.mockResolvedValue({ id: 'user-1', email: 'new@example.com' })
        mockAuthService.createEmailToken.mockResolvedValue('email-token-xyz')
        mockMailService.sendVerificationEmail.mockResolvedValue(undefined)

        const req = makeRequest({ email: 'new@example.com', name: 'New User', password: 'securepass1' })
        const res = await registerPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(201)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(json.data.message).toMatch(/verify your email/i)
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledOnce()
    })

    it('returns 422 when email is invalid', async () => {
        const req = makeRequest({ email: 'bad-email', name: 'User', password: 'securepass1' })
        const res = await registerPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(422)
        const json = await res.json()
        expect(json.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email
// ---------------------------------------------------------------------------

describe('GET /api/auth/verify-email', () => {
    const makeRequest = (params: Record<string, string>) => {
        const url = new URL('http://localhost:3000/api/auth/verify-email')
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
        return new NextRequest(url)
    }

    it('returns 422 when token query param is missing', async () => {
        const req = makeRequest({ callbackUrl: '/' })
        const res = await verifyEmailGET(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(422)
    })

    it('works without callbackUrl param (defaults to /)', async () => {
        const fakeUser = { id: 'user-1', email: 'user@example.com' }
        mockAuthService.verifyEmailToken.mockResolvedValue({ user: fakeUser, hashedToken: 'hashed-abc' })
        mockAuthService.markEmailVerified.mockResolvedValue(undefined)
        mockAuthService.consumeToken.mockResolvedValue(undefined)
        mockAuthService.createSession.mockResolvedValue({
            token: 'session-token-abc',
            cookieOptions: { httpOnly: true, path: '/' },
        })

        const req = makeRequest({ token: 'valid-token' })
        const res = await verifyEmailGET(req, { params: Promise.resolve({}) })

        expect([302, 307]).toContain(res.status)
        const location = res.headers.get('location')
        expect(location).toBeTruthy()
        expect(mockAuthService.markEmailVerified).toHaveBeenCalledWith('user-1')
    })

    it('redirects and sets session cookie on valid token', async () => {
        const fakeUser = { id: 'user-1', email: 'user@example.com' }
        mockAuthService.verifyEmailToken.mockResolvedValue({ user: fakeUser, hashedToken: 'hashed-abc' })
        mockAuthService.markEmailVerified.mockResolvedValue(undefined)
        mockAuthService.consumeToken.mockResolvedValue(undefined)
        mockAuthService.createSession.mockResolvedValue({
            token: 'session-token-abc',
            cookieOptions: { httpOnly: true, path: '/' },
        })

        const req = makeRequest({ token: 'valid-token', callbackUrl: '/dashboard' })
        const res = await verifyEmailGET(req, { params: Promise.resolve({}) })

        expect([302, 307]).toContain(res.status)
        const cookieHeader = res.headers.get('set-cookie')
        expect(cookieHeader).toContain('next-auth.session-token')
        expect(mockAuthService.markEmailVerified).toHaveBeenCalledWith('user-1')
        expect(mockAuthService.consumeToken).toHaveBeenCalledWith('hashed-abc')
    })
})

// ---------------------------------------------------------------------------
// POST /api/auth/resend-verification
// ---------------------------------------------------------------------------

describe('POST /api/auth/resend-verification', () => {
    const makeRequest = (body: object) =>
        new NextRequest(new URL('http://localhost:3000/api/auth/resend-verification'), {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })

    it('returns 422 when email is already verified', async () => {
        mockUserService.getByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: new Date(),
        })

        const req = makeRequest({ email: 'user@example.com' })
        const res = await resendVerificationPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(422)
        const json = await res.json()
        expect(json.success).toBe(false)
    })

    it('returns 204 when resend is successful', async () => {
        mockUserService.getByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: null,
        })
        mockAuthService.createEmailToken.mockResolvedValue('new-email-token')
        mockMailService.sendVerificationEmail.mockResolvedValue(undefined)

        const req = makeRequest({ email: 'user@example.com' })
        const res = await resendVerificationPOST(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(204)
        expect(mockMailService.sendVerificationEmail).toHaveBeenCalledOnce()
    })
})
