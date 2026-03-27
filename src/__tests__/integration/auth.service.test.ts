import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestError, NotFoundError } from '@/utils/errors'

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        verificationToken: {
            create: vi.fn(),
            deleteMany: vi.fn(),
            findUnique: vi.fn(),
            delete: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}))

vi.mock('next-auth/jwt', () => ({
    encode: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
    default: { hash: vi.fn() },
    hash: vi.fn(),
}))

import { authService } from '@/services/auth.service'
import { prisma } from '@/lib/db/prisma'
import { encode } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'

const mockPrisma = prisma as any
const mockEncode = encode as ReturnType<typeof vi.fn>
const mockBcrypt = bcrypt as any

const sampleUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    image: null,
    role: 'USER',
    password: 'hashed-pw',
    emailVerified: null,
}

beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-secret'
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
})

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
describe('AuthService.createSession', () => {
    it('calls encode with the correct payload and returns token and cookieOptions', async () => {
        mockEncode.mockResolvedValue('signed-jwt')

        const result = await authService.createSession(sampleUser as any)

        expect(mockEncode).toHaveBeenCalledWith(
            expect.objectContaining({
                secret: 'test-secret',
                token: expect.objectContaining({
                    sub: 'user-1',
                    id: 'user-1',
                    email: 'alice@example.com',
                    name: 'Alice',
                    role: 'USER',
                }),
            })
        )

        expect(result.token).toBe('signed-jwt')
        expect(result.cookieOptions).toMatchObject({
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
        })
        expect(typeof result.cookieOptions.maxAge).toBe('number')
    })
})

// ---------------------------------------------------------------------------
// createEmailToken
// ---------------------------------------------------------------------------
describe('AuthService.createEmailToken', () => {
    it('deletes existing tokens then creates a new one, returning the raw token', async () => {
        mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 })
        mockPrisma.verificationToken.create.mockResolvedValue({})

        const rawToken = await authService.createEmailToken('alice@example.com')

        expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
            where: { identifier: 'alice@example.com' },
        })

        expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    identifier: 'alice@example.com',
                    token: expect.any(String),
                    expires: expect.any(Date),
                }),
            })
        )

        // rawToken should be a hex string (not hashed)
        expect(typeof rawToken).toBe('string')
        expect(rawToken).toHaveLength(64) // 32 bytes as hex
    })

    it('stores a hashed token (different from rawToken) in the DB', async () => {
        mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 })

        let storedToken = ''
        mockPrisma.verificationToken.create.mockImplementation(({ data }: any) => {
            storedToken = data.token
            return Promise.resolve({})
        })

        const rawToken = await authService.createEmailToken('alice@example.com')

        expect(storedToken).not.toBe(rawToken)
        expect(storedToken).toHaveLength(64) // sha256 hex
    })
})

// ---------------------------------------------------------------------------
// verifyEmailToken
// ---------------------------------------------------------------------------
describe('AuthService.verifyEmailToken', () => {
    it('returns user and hashedToken for a valid unexpired token', async () => {
        const future = new Date(Date.now() + 15 * 60 * 1000)

        mockPrisma.verificationToken.findUnique.mockResolvedValue({
            token: 'hashed',
            identifier: 'alice@example.com',
            expires: future,
        })
        mockPrisma.user.findUnique.mockResolvedValue(sampleUser)

        // Create a real raw token so its hash matches what findUnique is called with
        // We'll use a controlled raw token by spying crypto indirectly via the service
        // Instead, provide an actual hex string and mock findUnique to return regardless
        const { user, hashedToken } = await authService.verifyEmailToken('aabbcc')

        expect(user).toEqual(sampleUser)
        expect(typeof hashedToken).toBe('string')
        expect(hashedToken).toHaveLength(64)
    })

    it('throws BadRequestError when the token record is not found', async () => {
        mockPrisma.verificationToken.findUnique.mockResolvedValue(null)

        await expect(authService.verifyEmailToken('invalid')).rejects.toThrow(BadRequestError)
    })

    it('throws BadRequestError when the token is expired', async () => {
        const past = new Date(Date.now() - 1000)

        mockPrisma.verificationToken.findUnique.mockResolvedValue({
            token: 'hashed',
            identifier: 'alice@example.com',
            expires: past,
        })

        await expect(authService.verifyEmailToken('rawtoken')).rejects.toThrow(BadRequestError)
    })

    it('throws NotFoundError when user is not found for the token identifier', async () => {
        const future = new Date(Date.now() + 60_000)

        mockPrisma.verificationToken.findUnique.mockResolvedValue({
            token: 'hashed',
            identifier: 'ghost@example.com',
            expires: future,
        })
        mockPrisma.user.findUnique.mockResolvedValue(null)

        await expect(authService.verifyEmailToken('rawtoken')).rejects.toThrow(NotFoundError)
    })
})

// ---------------------------------------------------------------------------
// consumeToken
// ---------------------------------------------------------------------------
describe('AuthService.consumeToken', () => {
    it('calls prisma.verificationToken.delete with the hashed token', async () => {
        mockPrisma.verificationToken.delete.mockResolvedValue({})

        await authService.consumeToken('some-hashed-token')

        expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
            where: { token: 'some-hashed-token' },
        })
    })
})

// ---------------------------------------------------------------------------
// markEmailVerified
// ---------------------------------------------------------------------------
describe('AuthService.markEmailVerified', () => {
    it('calls prisma.user.update with emailVerified set to a Date', async () => {
        mockPrisma.user.update.mockResolvedValue({ ...sampleUser, emailVerified: new Date() })

        await authService.markEmailVerified('user-1')

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { emailVerified: expect.any(Date) },
        })
    })
})

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
describe('AuthService.resetPassword', () => {
    it('verifies token, hashes new password, updates user, and consumes the token', async () => {
        const future = new Date(Date.now() + 60_000)

        mockPrisma.verificationToken.findUnique.mockResolvedValue({
            token: 'hashed',
            identifier: 'alice@example.com',
            expires: future,
        })
        mockPrisma.user.findUnique.mockResolvedValue(sampleUser)
        mockBcrypt.hash.mockResolvedValue('new-hashed-pw')
        mockPrisma.user.update.mockResolvedValue({ ...sampleUser, password: 'new-hashed-pw' })
        mockPrisma.verificationToken.delete.mockResolvedValue({})

        const result = await authService.resetPassword('rawtoken', 'NewPassword123!')

        expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12)
        expect(mockPrisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: { password: 'new-hashed-pw' },
            })
        )
        expect(mockPrisma.verificationToken.delete).toHaveBeenCalled()
        expect(result).toEqual(sampleUser)
    })
})
