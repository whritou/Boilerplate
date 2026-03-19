import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, resetPasswordSchema } from '@/validations/auth.schema'
import { cartItemBaseSchema } from '@/validations/cartItem.schema'
import { paymentBaseSchema } from '@/validations/payment.schema'
import { orderItemBaseSchema } from '@/validations/orderItem.schema'

// ---------------------------------------------------------------------------
// Note on thresholds
// Valid-input paths are fast (no error allocation).
// Invalid-input paths are ~3-5× slower because Zod allocates ZodError objects
// for each validation failure. Thresholds are set generously to avoid flakiness
// on CI while still catching catastrophic regressions.
// ---------------------------------------------------------------------------

describe('Performance: loginSchema', () => {
    it('validates 10,000 valid inputs in under 500ms', () => {
        const valid = { email: 'user@example.com', password: 'password123' }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            loginSchema.safeParse(valid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(500)
    })

    it('validates 10,000 invalid inputs in under 2000ms', () => {
        const invalid = { email: 'not-an-email', password: '' }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            loginSchema.safeParse(invalid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(2000)
    })
})

describe('Performance: registerSchema', () => {
    it('validates 10,000 valid inputs in under 500ms', () => {
        const valid = {
            email: 'user@example.com',
            name: 'John Doe',
            password: 'securepassword',
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            registerSchema.safeParse(valid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(500)
    })

    it('validates 10,000 invalid inputs in under 3000ms', () => {
        const invalid = {
            email: 'bad',
            name: 'J',
            password: 'short',
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            registerSchema.safeParse(invalid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(3000)
    })
})

describe('Performance: resetPasswordSchema', () => {
    it('validates 10,000 valid inputs in under 500ms', () => {
        const valid = {
            token: 'reset-token-abc',
            password: 'newpassword123',
            passwordConfirm: 'newpassword123',
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            resetPasswordSchema.safeParse(valid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(500)
    })

    it('validates 10,000 mismatched password inputs in under 2000ms', () => {
        const mismatched = {
            token: 'reset-token-abc',
            password: 'newpassword123',
            passwordConfirm: 'different456',
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            resetPasswordSchema.safeParse(mismatched)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(2000)
    })
})

describe('Performance: cartItemBaseSchema', () => {
    it('validates 10,000 valid inputs in under 200ms', () => {
        const valid = { productId: 'prod-abc', quantity: 3 }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            cartItemBaseSchema.safeParse(valid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(200)
    })

    it('validates 10,000 invalid inputs in under 2000ms', () => {
        const invalid = { productId: '', quantity: 0 }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            cartItemBaseSchema.safeParse(invalid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(2000)
    })
})

describe('Performance: paymentBaseSchema', () => {
    it('validates 10,000 valid inputs in under 300ms', () => {
        const valid = {
            orderId: 'order-abc',
            stripePaymentIntentId: 'pi_abc123',
            amount: '49.99',
            status: 'succeeded' as const,
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            paymentBaseSchema.safeParse(valid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(300)
    })

    it('validates 10,000 invalid inputs in under 2000ms', () => {
        const invalid = {
            orderId: '',
            stripePaymentIntentId: '',
            amount: '',
            status: 'not_a_status',
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            paymentBaseSchema.safeParse(invalid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(2000)
    })
})

describe('Performance: orderItemBaseSchema', () => {
    it('validates 10,000 valid inputs in under 200ms', () => {
        const valid = { productId: 'prod-xyz', quantity: 2, price: '19.99' }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            orderItemBaseSchema.safeParse(valid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(200)
    })

    it('validates 10,000 invalid inputs in under 2000ms', () => {
        const invalid = { productId: '', quantity: -1, price: '' }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            orderItemBaseSchema.safeParse(invalid)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(2000)
    })
})
