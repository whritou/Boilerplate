"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useOrder } from "@/hooks/useOrder"
import { useOrderStore } from "@/stores/order.store"
import DataState from "@/components/DataState"
import { ArrowLeft } from "lucide-react"
import { mapOrder } from "@/lib/mappers/order.mapper"
import { useCountdown } from "@/hooks/useCountdown"
import type { OrderEntity } from "@/types/models/order"

import { OrderRecap } from "@/components/checkout/OrderRecap"
import { AddressForm, type AddressData, type AddressFields } from "@/components/checkout/AddressForm"
import { PaymentSection } from "@/components/checkout/PaymentSection"
import { ExpirationBanner } from "@/components/checkout/ExpirationBanner"

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
    const paymentReturnRef = useRef(false)
    const invalidate = useOrderStore((s) => s.invalidate)

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

    const addressValues: AddressFields = { firstName, lastName, street, city, zipCode, country, phone }

    const handleAddressChange = useCallback((field: keyof AddressFields, value: string) => {
        const setters: Record<keyof AddressFields, (v: string) => void> = {
            firstName: setFirstName, lastName: setLastName, street: setStreet,
            city: setCity, zipCode: setZipCode, country: setCountry, phone: setPhone,
        }
        setters[field](value)
    }, [])

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
            paymentReturnRef.current = true
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
        if (paymentReturnRef.current) return
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
            const data: AddressData = {
                shippingFirstName: firstName,
                shippingLastName: lastName,
                shippingStreet: street,
                shippingCity: city,
                shippingZipCode: zipCode,
                shippingCountry: country,
                shippingPhone: phone || undefined,
            }

            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
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

            {!isPaid && !isExpired && countdown && (
                <ExpirationBanner minutes={countdown.minutes} seconds={countdown.seconds} />
            )}

            <OrderRecap order={order} />

            {!isPaid && !isExpired && (
                <AddressForm
                    values={addressValues}
                    onChange={handleAddressChange}
                    saved={addressSaved}
                    saving={addressSaving}
                    error={addressError}
                    onSavedChange={setAddressSaved}
                    onSubmit={handleAddressSubmit}
                />
            )}

            <PaymentSection
                orderId={orderId}
                totalPrice={order.totalPrice}
                isPaid={isPaid}
                isExpired={isExpired}
                addressSaved={addressSaved}
                clientSecret={clientSecret}
                intentLoading={intentLoading}
                intentError={intentError}
            />
        </div>
    )
}
