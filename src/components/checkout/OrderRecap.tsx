"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { OrderEntity } from "@/types/models/order"

interface Props {
    order: OrderEntity
}

export function OrderRecap({ order }: Props) {
    return (
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
    )
}
