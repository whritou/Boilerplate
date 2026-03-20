import { describe, it, expect } from 'vitest'
import {
    statusVariant,
    paymentVariant,
    paymentLabels,
    statusOptions,
} from '@/utils/orderStatus'

describe('statusVariant', () => {
    it('returns "outline" for pending', () => {
        expect(statusVariant('pending')).toBe('outline')
    })

    it('returns "default" for confirmed', () => {
        expect(statusVariant('confirmed')).toBe('default')
    })

    it('returns "secondary" for shipped', () => {
        expect(statusVariant('shipped')).toBe('secondary')
    })

    it('returns "default" for delivered', () => {
        expect(statusVariant('delivered')).toBe('default')
    })

    it('returns "destructive" for canceled', () => {
        expect(statusVariant('canceled')).toBe('destructive')
    })

    it('returns "destructive" for expired', () => {
        expect(statusVariant('expired')).toBe('destructive')
    })

    it('returns "outline" for unknown status', () => {
        expect(statusVariant('unknown-status')).toBe('outline')
    })

    it('returns "outline" for empty string', () => {
        expect(statusVariant('')).toBe('outline')
    })
})

describe('paymentVariant', () => {
    it('returns "default" for succeeded', () => {
        expect(paymentVariant('succeeded')).toBe('default')
    })

    it('returns "outline" for processing', () => {
        expect(paymentVariant('processing')).toBe('outline')
    })

    it('returns "destructive" for canceled', () => {
        expect(paymentVariant('canceled')).toBe('destructive')
    })

    it('returns "destructive" for refunded', () => {
        expect(paymentVariant('refunded')).toBe('destructive')
    })

    it('returns "outline" for requires_payment_method', () => {
        expect(paymentVariant('requires_payment_method')).toBe('outline')
    })

    it('returns "outline" for requires_capture', () => {
        expect(paymentVariant('requires_capture')).toBe('outline')
    })

    it('returns "outline" for requires_action', () => {
        expect(paymentVariant('requires_action')).toBe('outline')
    })

    it('returns "outline" for requires_confirmation', () => {
        expect(paymentVariant('requires_confirmation')).toBe('outline')
    })

    it('returns "outline" for unknown payment status', () => {
        expect(paymentVariant('unknown')).toBe('outline')
    })

    it('returns "outline" for empty string', () => {
        expect(paymentVariant('')).toBe('outline')
    })
})

describe('paymentLabels', () => {
    it('has label "Paid" for succeeded', () => {
        expect(paymentLabels['succeeded']).toBe('Paid')
    })

    it('has label "Processing" for processing', () => {
        expect(paymentLabels['processing']).toBe('Processing')
    })

    it('has label "Canceled" for canceled', () => {
        expect(paymentLabels['canceled']).toBe('Canceled')
    })

    it('has label "Refunded" for refunded', () => {
        expect(paymentLabels['refunded']).toBe('Refunded')
    })

    it('has label "Payment Required" for requires_payment_method', () => {
        expect(paymentLabels['requires_payment_method']).toBe('Payment Required')
    })

    it('returns undefined for unknown key', () => {
        expect(paymentLabels['unknown']).toBeUndefined()
    })
})

describe('statusOptions', () => {
    it('is an array', () => {
        expect(Array.isArray(statusOptions)).toBe(true)
    })

    it('contains all expected status values', () => {
        const values = statusOptions.map((o) => o.value)
        expect(values).toContain('pending')
        expect(values).toContain('confirmed')
        expect(values).toContain('shipped')
        expect(values).toContain('delivered')
        expect(values).toContain('canceled')
        expect(values).toContain('expired')
    })

    it('each entry has value and label', () => {
        for (const option of statusOptions) {
            expect(option).toHaveProperty('value')
            expect(option).toHaveProperty('label')
        }
    })
})
