import { sendVerificationEmail, sendResetPasswordEmail, sendOrderRefundEmail } from "@/utils/mail"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!

export class MailService {
    async sendVerificationEmail(email: string, token: string, callbackUrl = "/"): Promise<void> {
        const link = `${BASE_URL}/api/auth/verify-email?token=${token}&callbackUrl=${encodeURIComponent(callbackUrl)}`
        await sendVerificationEmail(email, link)
    }

    async sendResetPasswordEmail(email: string, token: string): Promise<void> {
        const link = `${BASE_URL}/reset-password?token=${token}`
        await sendResetPasswordEmail(email, link)
    }

    async sendOrderRefundEmail(email: string, orderId: string, amount: string): Promise<void> {
        await sendOrderRefundEmail(email, orderId, amount)
    }
}

export const mailService = new MailService()
