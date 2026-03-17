"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { OrderEntity } from "@/types/models/order"

interface Props {
    order: OrderEntity | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function OrderDetailsModal({ order, open, onOpenChange }: Props) {
    if (!order) return null

    const hasAddress = !!(order.shippingFirstName || order.shippingStreet)

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
                            <Badge>{order.status}</Badge>
                        </div>

                        <div>
                            <p className="text-muted-foreground">Payment</p>
                            <Badge>{order.paymentStatus}</Badge>
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

                </div>
            </DialogContent>
        </Dialog>
    )
}
