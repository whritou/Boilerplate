"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCartStore } from "@/stores/cart.store"
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useOrderStore } from "@/stores/order.store"

export function CartDrawer() {
    const { data: session } = useSession()
    const router = useRouter()

    const cart = useCartStore((s) => s.cart)
    const loading = useCartStore((s) => s.loading)
    const error = useCartStore((s) => s.error)

    const fetchCart = useCartStore((s) => s.fetchCart)
    const updateItem = useCartStore((s) => s.updateItem)
    const removeItem = useCartStore((s) => s.removeItem)

    const createOrder = useOrderStore((s) => s.createOne)
    const orderError = useOrderStore((s) => s.error)
    const clearOrderError = useOrderStore((s) => s.clearError)

    const [open, setOpen] = useState(false)
    const [ordering, setOrdering] = useState(false)

    useEffect(() => {
        if (session && open && !cart) {
            fetchCart()
        }
    }, [session, open, cart, fetchCart])

    const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
    const total = cart?.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0) ?? 0

    const handleOrder = async () => {
        setOrdering(true)
        clearOrderError()

        const result = await createOrder({})

        setOrdering(false)

        if (!result) return

        setOpen(false)
        router.push(`/checkout/${result.id}`)
    }

    if (!session) return null

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={"Shopping Cart"}>
                    <ShoppingCart className="h-5 w-5" />
                    {itemCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                            {itemCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Cart ({itemCount})</SheetTitle>
                </SheetHeader>

                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                )}

                {(error || orderError) && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {error || orderError}
                    </div>
                )}

                {!loading && (!cart || cart.items.length === 0) && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Your cart is empty</p>
                    </div>
                )}

                {cart && cart.items.length > 0 && (
                    <>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {cart.items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {item.product?.name ?? item.productId}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {parseFloat(item.price).toFixed(2)} € x {item.quantity}
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={() => updateItem(item.id, Math.max(0, item.quantity - 1))}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={() => updateItem(item.id, item.quantity + 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <SheetFooter className="flex-col gap-3 sm:flex-col">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-base font-semibold">Total</span>
                                <span className="text-lg font-bold">{total.toFixed(2)} €</span>
                            </div>
                            <Button className="w-full" size="lg" onClick={handleOrder} disabled={ordering}>
                                {ordering ? "Creation of your order..." : "Order"}
                            </Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
