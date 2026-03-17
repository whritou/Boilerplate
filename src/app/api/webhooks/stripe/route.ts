import { NextRequest, NextResponse } from 'next/server'

import { stripe } from '@/lib/stripe'
import { paymentService } from '@/services/payment.service'
import type { PaymentStatus } from '@prisma/client'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * Maps Stripe PaymentIntent statuses to our PaymentStatus enum.
 */
function mapStripeStatus(stripeStatus: string): PaymentStatus | null {
    const mapping: Record<string, PaymentStatus> = {
        requires_payment_method: 'requires_payment_method',
        requires_confirmation:   'requires_confirmation',
        requires_action:         'requires_action',
        processing:              'processing',
        requires_capture:        'requires_capture',
        canceled:                'canceled',
        succeeded:               'succeeded',
    }

    return mapping[stripeStatus] ?? null
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
    }

    let event

    try {
        event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
    } catch (err) {
        console.error('[Stripe Webhook] Signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                await paymentService.handleCheckoutCompleted(session.id)
                break
            }

            case 'payment_intent.succeeded':
            case 'payment_intent.payment_failed':
            case 'payment_intent.canceled': {
                const paymentIntent = event.data.object
                const status = mapStripeStatus(paymentIntent.status)

                if (status) {
                    await paymentService.handleStripeWebhook(paymentIntent.id, status)
                }
                break
            }

            default:
                // Unhandled event type — acknowledge it
                break
        }
    } catch (err) {
        console.error(`[Stripe Webhook] Error handling ${event.type}:`, err)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
