"use client"

import Link from "next/link"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { PaymentForm } from "./PaymentForm"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
    orderId: string
    totalPrice: string
    isPaid: boolean
    isExpired: boolean
    addressSaved: boolean
    clientSecret: string | null
    intentLoading: boolean
    intentError: string | null
}

export function PaymentSection({
    orderId,
    totalPrice,
    isPaid,
    isExpired,
    addressSaved,
    clientSecret,
    intentLoading,
    intentError,
}: Props) {
    if (isExpired) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                    <XCircle className="w-12 h-12 text-destructive" />
                    <p className="text-lg font-semibold">Order expired</p>
                    <p className="text-sm text-muted-foreground">This order has expired because it was not paid in time. Stock has been restored.</p>
                    <Link href="/products">
                        <Button variant="outline">Back to products</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    if (isPaid) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                    <p className="text-lg font-semibold">Order paid</p>
                    <p className="text-sm text-muted-foreground">Your payment has been confirmed.</p>
                    <Link href="/orders">
                        <Button variant="outline">See my orders</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    if (!addressSaved) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
                {intentLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Initialization of the payment...</span>
                    </div>
                )}

                {intentError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {intentError}
                    </div>
                )}

                {clientSecret && (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: "stripe",
                                variables: {
                                    borderRadius: "8px",
                                },
                            },
                        }}
                    >
                        <PaymentForm orderId={orderId} totalPrice={totalPrice} />
                    </Elements>
                )}
            </CardContent>
        </Card>
    )
}
