import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/mail', () => ({
    sendVerificationEmail: vi.fn(),
    sendResetPasswordEmail: vi.fn(),
    sendOrderRefundEmail: vi.fn(),
}))

import { mailService } from '@/services/mail.service'
import {
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendOrderRefundEmail,
} from '@/utils/mail'

const mockSendVerification = sendVerificationEmail as ReturnType<typeof vi.fn>
const mockSendReset = sendResetPasswordEmail as ReturnType<typeof vi.fn>
const mockSendRefund = sendOrderRefundEmail as ReturnType<typeof vi.fn>

beforeEach(() => {
    vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// sendVerificationEmail
// ---------------------------------------------------------------------------
describe('MailService.sendVerificationEmail', () => {
    it('constructs a link with the verify-email path and calls the util', async () => {
        mockSendVerification.mockResolvedValue(undefined)

        await mailService.sendVerificationEmail('alice@example.com', 'mytoken')

        expect(mockSendVerification).toHaveBeenCalledOnce()

        const [email, link] = mockSendVerification.mock.calls[0]
        expect(email).toBe('alice@example.com')
        expect(link).toContain('/api/auth/verify-email')
        expect(link).toContain('token=mytoken')
        // default callbackUrl is "/" → encodes to %2F
        expect(link).toContain('callbackUrl=%2F')
    })

    it('encodes a custom callbackUrl properly', async () => {
        mockSendVerification.mockResolvedValue(undefined)

        await mailService.sendVerificationEmail(
            'alice@example.com',
            'mytoken',
            '/dashboard?tab=orders'
        )

        const [, link] = mockSendVerification.mock.calls[0]
        expect(link).toContain('token=mytoken')
        // /dashboard?tab=orders encodes to %2Fdashboard%3Ftab%3Dorders
        expect(link).toContain('callbackUrl=%2Fdashboard%3Ftab%3Dorders')
    })

    it('passes the email as the first argument to the util', async () => {
        mockSendVerification.mockResolvedValue(undefined)

        await mailService.sendVerificationEmail('bob@example.com', 'tok123')

        const [email] = mockSendVerification.mock.calls[0]
        expect(email).toBe('bob@example.com')
    })

    it('includes the token in the constructed link', async () => {
        mockSendVerification.mockResolvedValue(undefined)

        await mailService.sendVerificationEmail('alice@example.com', 'unique-token-xyz')

        const [, link] = mockSendVerification.mock.calls[0]
        expect(link).toContain('token=unique-token-xyz')
    })
})

// ---------------------------------------------------------------------------
// sendResetPasswordEmail
// ---------------------------------------------------------------------------
describe('MailService.sendResetPasswordEmail', () => {
    it('constructs the correct reset link and calls the util', async () => {
        mockSendReset.mockResolvedValue(undefined)

        await mailService.sendResetPasswordEmail('alice@example.com', 'resettoken')

        expect(mockSendReset).toHaveBeenCalledOnce()

        const [email, link] = mockSendReset.mock.calls[0]
        expect(email).toBe('alice@example.com')
        expect(link).toContain('/reset-password')
        expect(link).toContain('token=resettoken')
    })

    it('includes the token in the reset link', async () => {
        mockSendReset.mockResolvedValue(undefined)

        await mailService.sendResetPasswordEmail('bob@example.com', 'tok456')

        const [, link] = mockSendReset.mock.calls[0]
        expect(link).toContain('token=tok456')
        expect(link).toContain('/reset-password')
    })

    it('passes the email as the first argument', async () => {
        mockSendReset.mockResolvedValue(undefined)

        await mailService.sendResetPasswordEmail('carol@example.com', 'tok789')

        const [email] = mockSendReset.mock.calls[0]
        expect(email).toBe('carol@example.com')
    })
})

// ---------------------------------------------------------------------------
// sendOrderRefundEmail
// ---------------------------------------------------------------------------
describe('MailService.sendOrderRefundEmail', () => {
    it('passes email, orderId, and amount directly to the util', async () => {
        mockSendRefund.mockResolvedValue(undefined)

        await mailService.sendOrderRefundEmail('alice@example.com', 'ord-123', '49.99')

        expect(mockSendRefund).toHaveBeenCalledOnce()
        expect(mockSendRefund).toHaveBeenCalledWith('alice@example.com', 'ord-123', '49.99')
    })

    it('does not construct or modify any links (passes args as-is)', async () => {
        mockSendRefund.mockResolvedValue(undefined)

        await mailService.sendOrderRefundEmail('bob@example.com', 'ord-999', '0.00')

        const [email, orderId, amount] = mockSendRefund.mock.calls[0]
        expect(email).toBe('bob@example.com')
        expect(orderId).toBe('ord-999')
        expect(amount).toBe('0.00')
    })
})
