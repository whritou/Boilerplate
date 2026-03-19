"use client"

import { useState } from "react"
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"

interface Props {
    orderId: string
    totalPrice: string
}

export function PaymentForm({ orderId, totalPrice }: Props) {
    const stripe = useStripe()
    const elements = useElements()
    const [paying, setPaying] = useState(false)
    const [payError, setPayError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stripe || !elements) return

        setPaying(true)
        setPayError(null)

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout/${orderId}?payment=complete`,
            },
        })

        if (error) {
            setPayError(error.message ?? "Payment error.")
        }

        setPaying(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />

            {payError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {payError}
                </div>
            )}

            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!stripe || !elements || paying}
            >
                {paying ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Payment in progress...</>
                ) : (
                    <><CreditCard className="w-4 h-4 mr-2" /> Pay {parseFloat(totalPrice).toFixed(2)} &euro;</>
                )}
            </Button>
        </form>
    )
}
