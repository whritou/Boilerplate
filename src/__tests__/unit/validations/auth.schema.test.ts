import { describe, it, expect } from 'vitest'
import {
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    emailTokenSchema,
    verifyEmailQuerySchema,
} from '@/validations/auth.schema'

describe('loginSchema', () => {
    it('accepts valid login data', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' })
        expect(result.success).toBe(true)
    })

    it('rejects missing email', () => {
        const result = loginSchema.safeParse({ password: 'secret' })
        expect(result.success).toBe(false)
    })

    it('rejects missing password', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com' })
        expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
        expect(result.success).toBe(false)
    })

    it('rejects invalid email format', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
        expect(result.success).toBe(false)
    })

    it('normalizes email to lowercase', () => {
        const result = loginSchema.safeParse({ email: 'USER@EXAMPLE.COM', password: 'secret' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.email).toBe('user@example.com')
        }
    })
})

describe('registerSchema', () => {
    it('accepts valid registration data', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John Doe',
        })
        expect(result.success).toBe(true)
    })

    it('accepts full registration data with all optional fields', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John Doe',
            password: 'password123',
            role: 'USER',
            image: 'https://example.com/avatar.png',
        })
        expect(result.success).toBe(true)
    })

    it('rejects name shorter than 2 characters', () => {
        const result = registerSchema.safeParse({ email: 'user@example.com', name: 'J' })
        expect(result.success).toBe(false)
    })

    it('rejects password shorter than 8 characters', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John',
            password: 'short',
        })
        expect(result.success).toBe(false)
    })

    it('rejects invalid image URL', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John',
            image: 'not-a-url',
        })
        expect(result.success).toBe(false)
    })

    it('allows image to be null', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John',
            image: null,
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid role value', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John',
            role: 'SUPERADMIN',
        })
        expect(result.success).toBe(false)
    })

    it('accepts ADMIN role', () => {
        const result = registerSchema.safeParse({
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'ADMIN',
        })
        expect(result.success).toBe(true)
    })

    it('password is optional', () => {
        const result = registerSchema.safeParse({
            email: 'user@example.com',
            name: 'John Doe',
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.password).toBeUndefined()
        }
    })
})

describe('resetPasswordSchema', () => {
    it('accepts matching passwords', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'abc123',
            password: 'newpassword',
            passwordConfirm: 'newpassword',
        })
        expect(result.success).toBe(true)
    })

    it('rejects mismatched passwords', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'abc123',
            password: 'newpassword',
            passwordConfirm: 'different',
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join('.'))
            expect(paths).toContain('passwordConfirm')
        }
    })

    it('rejects password shorter than 8 characters', () => {
        const result = resetPasswordSchema.safeParse({
            token: 'abc123',
            password: 'short',
            passwordConfirm: 'short',
        })
        expect(result.success).toBe(false)
    })

    it('rejects missing token', () => {
        const result = resetPasswordSchema.safeParse({
            token: '',
            password: 'newpassword',
            passwordConfirm: 'newpassword',
        })
        expect(result.success).toBe(false)
    })
})

describe('emailTokenSchema', () => {
    it('accepts valid email', () => {
        const result = emailTokenSchema.safeParse({ email: 'user@example.com' })
        expect(result.success).toBe(true)
    })

    it('rejects missing email', () => {
        const result = emailTokenSchema.safeParse({})
        expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
        const result = emailTokenSchema.safeParse({ email: 'not-valid' })
        expect(result.success).toBe(false)
    })

    it('defaults callbackUrl to "/"', () => {
        const result = emailTokenSchema.safeParse({ email: 'user@example.com' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.callbackUrl).toBe('/')
        }
    })

    it('accepts a custom callbackUrl', () => {
        const result = emailTokenSchema.safeParse({
            email: 'user@example.com',
            callbackUrl: '/dashboard',
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.callbackUrl).toBe('/dashboard')
        }
    })
})

describe('verifyEmailQuerySchema', () => {
    it('accepts a valid token', () => {
        const result = verifyEmailQuerySchema.safeParse({ token: 'abc123' })
        expect(result.success).toBe(true)
    })

    it('rejects missing token', () => {
        const result = verifyEmailQuerySchema.safeParse({})
        expect(result.success).toBe(false)
    })

    it('rejects empty token', () => {
        const result = verifyEmailQuerySchema.safeParse({ token: '' })
        expect(result.success).toBe(false)
    })

    it('defaults callbackUrl to "/"', () => {
        const result = verifyEmailQuerySchema.safeParse({ token: 'abc123' })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.callbackUrl).toBe('/')
        }
    })

    it('accepts a custom callbackUrl', () => {
        const result = verifyEmailQuerySchema.safeParse({
            token: 'abc123',
            callbackUrl: '/welcome',
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.callbackUrl).toBe('/welcome')
        }
    })
})
