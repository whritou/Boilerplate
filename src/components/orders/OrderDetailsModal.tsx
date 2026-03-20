"use client"

import { useState } from "react"
import { mapOrder } from "@/lib/mappers/order.mapper"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import { OrderEntity } from "@/types/models/order"
import { statusVariant, paymentVariant, paymentLabels } from "@/utils/orderStatus"

interface Props {
    order: OrderEntity | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onRefunded?: (order: OrderEntity) => void
}

export function OrderDetailsModal({ order, open, onOpenChange, onRefunded }: Props) {
    const [refunding, setRefunding] = useState(false)
    const [refundError, setRefundError] = useState<string | null>(null)

    if (!order) return null

    const hasAddress = !!(order.shippingFirstName || order.shippingStreet)
    const canRefund = order.status !== "canceled" && order.status !== "expired" && order.paymentStatus === "succeeded" &&
        order.status != "shipped" && order.status !== "delivered"

    const handleRefund = async () => {
        setRefunding(true)
        setRefundError(null)

        try {
            const res = await fetch(`/api/orders/${order.id}/refund`, { method: "POST" })
            const json = await res.json()

            if (!res.ok) {
                setRefundError(json?.error?.message || json?.error || "Refund failed")
                return
            }

            onRefunded?.(mapOrder(json.data))
            onOpenChange(false)
        } catch {
            setRefundError("Network error")
        } finally {
            setRefunding(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Order #{order.id.slice(0, 8)}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 text-sm">

                    {/* CUSTOMER */}
                    <div>
                        <p className="text-muted-foreground mb-1">Customer</p>
                        {order.user ? (
                            <div>
                                <p className="font-medium">{order.user.name ?? "No name"}</p>
                                <p className="text-muted-foreground">{order.user.email}</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">{order.userId}</p>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <div>
                            <p className="text-muted-foreground">Status</p>
                            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Payment</p>
                            <Badge variant={paymentVariant(order.paymentStatus)}>
                                {paymentLabels[order.paymentStatus] || order.paymentStatus}
                            </Badge>
                        </div>
                    </div>

                    <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium">
                            {parseFloat(order.totalPrice).toFixed(2)} &euro;
                        </p>
                    </div>

                    <div>
                        <p className="text-muted-foreground">Created at</p>
                        <p>{order.createdAt.toLocaleString()}</p>
                    </div>

                    <Separator />

                    {/* SHIPPING ADDRESS */}
                    <div>
                        <p className="text-muted-foreground mb-1">Shipping Address</p>
                        {hasAddress ? (
                            <div className="space-y-0.5">
                                <p className="font-medium">{order.shippingFirstName} {order.shippingLastName}</p>
                                <p>{order.shippingStreet}</p>
                                <p>{order.shippingZipCode} {order.shippingCity}</p>
                                <p>{order.shippingCountry}</p>
                                {order.shippingPhone && <p>{order.shippingPhone}</p>}
                            </div>
                        ) : (
                            <p className="text-muted-foreground italic">No address provided</p>
                        )}
                    </div>

                    <Separator />

                    {/* ITEMS */}
                    <div>
                        <p className="text-muted-foreground mb-2">Items</p>

                        <div className="border rounded-lg divide-y">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between p-3">
                                    <div>
                                        <p className="font-medium">Product: {item.product?.name ?? item.productId}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Qty: {item.quantity}
                                        </p>
                                    </div>

                                    <p className="font-medium">
                                        {(parseFloat(item.price) * item.quantity).toFixed(2)} &euro;
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CANCEL & REFUND */}
                    {canRefund && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                {refundError && (
                                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                        {refundError}
                                    </div>
                                )}

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            disabled={refunding}
                                        >
                                            {refunding ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing refund...</>
                                            ) : (
                                                "Cancel & Refund"
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Cancel & refund this order?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will issue a full refund of {parseFloat(order.totalPrice).toFixed(2)} &euro; to the customer.
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Keep order</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRefund} disabled={refunding}>
                                                {refunding ? "Processing..." : "Yes, refund"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    )
}
