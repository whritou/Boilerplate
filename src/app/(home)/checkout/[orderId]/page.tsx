"use client"

import { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { useOrder } from "@/hooks/useOrder"
import { useOrderStore } from "@/stores/order.store"
import DataState from "@/components/DataState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CreditCard, Loader2, CheckCircle2, Clock, XCircle, MapPin } from "lucide-react"
import { mapOrder } from "@/lib/mappers/order.mapper"
import { useCountdown } from "@/hooks/useCountdown"
import type { OrderEntity } from "@/types/models/order"

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
                    <><CreditCard className="w-4 h-4 mr-2" /> Pay {parseFloat(totalPrice).toFixed(2)} &euro;</>
                )}
            </Button>
        </form>
    )
}

function hasShippingAddress(order: OrderEntity): boolean {
    return !!(order.shippingFirstName && order.shippingLastName && order.shippingStreet && order.shippingCity && order.shippingZipCode && order.shippingCountry)
}

export default function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = use(params)
    const { order, loading, error } = useOrder(orderId)
    const { data: session } = useSession()
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [intentError, setIntentError] = useState<string | null>(null)
    const [intentLoading, setIntentLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const invalidate = useOrderStore((s) => s.invalidate)

    // Address form state
    const [addressSaved, setAddressSaved] = useState(false)
    const [addressSaving, setAddressSaving] = useState(false)
    const [addressError, setAddressError] = useState<string | null>(null)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [street, setStreet] = useState("")
    const [city, setCity] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [country, setCountry] = useState("")
    const [phone, setPhone] = useState("")

    // Prefill address from order (if already saved) or from session user data
    const [prefilled, setPrefilled] = useState(false)
    useEffect(() => {
        if (prefilled) return
        if (!order) return

        if (hasShippingAddress(order)) {
            setFirstName(order.shippingFirstName ?? "")
            setLastName(order.shippingLastName ?? "")
            setStreet(order.shippingStreet ?? "")
            setCity(order.shippingCity ?? "")
            setZipCode(order.shippingZipCode ?? "")
            setCountry(order.shippingCountry ?? "")
            setPhone(order.shippingPhone ?? "")
            setAddressSaved(true)
            setPrefilled(true)
        } else if (session?.user) {
            const nameParts = (session.user.name ?? "").split(" ")
            setFirstName(nameParts[0] ?? "")
            setLastName(nameParts.slice(1).join(" ") ?? "")
            setPrefilled(true)
        }
    }, [order, session, prefilled])

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

    // Only create payment intent after address is saved
    useEffect(() => {
        if (!order || order.paymentStatus === "succeeded" || order.status === "canceled" || syncing) return
        if (countdown?.expired) return
        if (!addressSaved) return

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
    }, [order, syncing, countdown?.expired, addressSaved])

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddressSaving(true)
        setAddressError(null)

        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shippingFirstName: firstName,
                    shippingLastName: lastName,
                    shippingStreet: street,
                    shippingCity: city,
                    shippingZipCode: zipCode,
                    shippingCountry: country,
                    shippingPhone: phone || undefined,
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                setAddressError(json?.error?.message || "Failed to save address.")
                return
            }

            const json = await res.json()
            const updated = mapOrder(json.data)
            useOrderStore.setState((state) => ({
                entities: { ...state.entities, [orderId]: updated },
            }))
            setAddressSaved(true)
        } catch {
            setAddressError("Network error.")
        } finally {
            setAddressSaving(false)
        }
    }

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
                                <span className="font-medium">{item.product?.name ?? item.productId}</span>
                                <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                            </div>
                            <span className="font-medium">
                                {(parseFloat(item.price) * item.quantity).toFixed(2)} &euro;
                            </span>
                        </div>
                    ))}

                    <Separator />

                    <div className="flex items-center justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{parseFloat(order.totalPrice).toFixed(2)} &euro;</span>
                    </div>
                </CardContent>
            </Card>

            {/* Shipping Address */}
            {!isPaid && !isExpired && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Shipping Address
                            {addressSaved && (
                                <Badge variant="secondary" className="ml-auto">Saved</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {addressSaved ? (
                            <div className="space-y-1 text-sm">
                                <p className="font-medium">{firstName} {lastName}</p>
                                <p>{street}</p>
                                <p>{zipCode} {city}</p>
                                <p>{country}</p>
                                {phone && <p>{phone}</p>}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => setAddressSaved(false)}
                                >
                                    Edit address
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleAddressSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First name *</Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last name *</Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="street">Street *</Label>
                                    <Input
                                        id="street"
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="zipCode">Zip code *</Label>
                                        <Input
                                            id="zipCode"
                                            value={zipCode}
                                            onChange={(e) => setZipCode(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City *</Label>
                                        <Input
                                            id="city"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country *</Label>
                                        <Input
                                            id="country"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {addressError && (
                                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                        {addressError}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={addressSaving}
                                >
                                    {addressSaving ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        "Continue to payment"
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

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
            ) : addressSaved ? (
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
            ) : null}
        </div>
    )
}
