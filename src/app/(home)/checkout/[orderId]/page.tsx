"use client"

import { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { useOrder } from "@/hooks/useOrder"
import { useOrderStore } from "@/stores/order.store"
import DataState from "@/components/DataState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CreditCard, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react"
import { mapOrder } from "@/lib/mappers/order.mapper"
import { useCountdown } from "@/hooks/useCountdown"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)


function PaymentForm({ orderId, totalPrice }: { orderId: string; totalPrice: string }) {
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
                    <><CreditCard className="w-4 h-4 mr-2" /> Pay {parseFloat(totalPrice).toFixed(2)} €</>
                )}
            </Button>
        </form>
    )
}

export default function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params)
    const { order, loading, error } = useOrder(orderId)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [intentError, setIntentError] = useState<string | null>(null)
    const [intentLoading, setIntentLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const invalidate = useOrderStore((s) => s.invalidate)

    const countdown = useCountdown(order?.expiresAt)
    const isExpired = order?.status === "canceled" || (countdown?.expired ?? false)

    const syncPayment = useCallback(async () => {
        setSyncing(true)
        try {
            const res = await fetch(`/api/orders/${orderId}/sync-payment`, { method: "POST" })
            if (res.ok) {
                const json = await res.json()
                const synced = mapOrder(json.data)
                useOrderStore.setState((state) => ({
                    entities: { ...state.entities, [orderId]: synced },
                }))
                invalidate()
            }
        } catch {
        } finally {
            setSyncing(false)
        }
    }, [orderId, invalidate])

    // On mount, if URL has ?payment=complete or Stripe redirect params, sync payment status
    useEffect(() => {
        const url = new URL(window.location.href)
        if (url.searchParams.has("payment") || url.searchParams.has("payment_intent")) {
            syncPayment()
            url.searchParams.delete("payment")
            url.searchParams.delete("payment_intent")
            url.searchParams.delete("payment_intent_client_secret")
            url.searchParams.delete("redirect_status")
            window.history.replaceState({}, "", url.pathname)
        }
    }, [syncPayment])

    useEffect(() => {
        if (!order || order.paymentStatus === "succeeded" || order.status === "canceled" || syncing) return
        if (countdown?.expired) return

        setIntentLoading(true)
        setIntentError(null)

        fetch("/api/payments/create-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
        })
            .then(async (res) => {
                const json = await res.json()
                if (!res.ok) {
                    setIntentError(json?.error?.message || "Impossible to initialize the payment.")
                    return
                }
                setClientSecret(json.data.clientSecret)
            })
            .catch(() => setIntentError("Network error."))
            .finally(() => setIntentLoading(false))
    }, [order, syncing, countdown?.expired])

    const items = order ? [order] : []

    if (loading || syncing || error || !order) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" /> My orders
                </Link>
                <DataState
                    loading={loading || syncing}
                    error={error}
                    data={items}
                    loadingMessage="Loading order..."
                    errorMessage={error || undefined}
                    emptyMessage="Order not found."
                />
            </div>
        )
    }

    const isPaid = order.paymentStatus === "succeeded"

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4" /> My orders
            </Link>

            <h1 className="text-2xl font-bold mb-6">Place Order</h1>

            {/* Expiration countdown banner */}
            {!isPaid && !isExpired && countdown && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                        Time remaining to pay: <strong>{countdown.minutes}:{String(countdown.seconds).padStart(2, "0")}</strong>
                    </span>
                </div>
            )}

            {/* Order Recap */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Recap</span>
                        <Badge variant={order.status === "pending" ? "outline" : order.status === "canceled" ? "destructive" : "secondary"}>
                            {order.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                    {order.items.map((item, i) => (
                        <div key={item.id ?? i} className="flex items-center justify-between text-sm">
                            <div>
                                <span className="font-medium">{item.productId}</span>
                                <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                            </div>
                            <span className="font-medium">
                                {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                            </span>
                        </div>
                    ))}

                    <Separator />

                    <div className="flex items-center justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{parseFloat(order.totalPrice).toFixed(2)} €</span>
                    </div>
                </CardContent>
            </Card>

            {/* Payment section */}
            {isExpired ? (
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
            ) : isPaid ? (
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
            ) : (
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
                                <PaymentForm orderId={orderId} totalPrice={order.totalPrice} />
                            </Elements>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
