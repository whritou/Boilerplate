"use client"

import { use, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useProduct } from "@/hooks/useProduct"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ShoppingCart, Minus, Plus, Check, PackageOpen, AlertCircle } from "lucide-react"
import { useCartStore } from "@/stores/cart.store"
import { ProductDetailSkeleton } from "@/components/products/ProductDetailSkeleton"
import { signIn } from "next-auth/react"

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { product, loading, error } = useProduct(id)
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)
    const [added, setAdded] = useState(false)
    const [quantity, setQuantity] = useState(1)

    const addItem = useCartStore((s) => s.addItem)
    const storeError = useCartStore((s) => s.error)
    const clearError = useCartStore((s) => s.clearError)

    const increase = () => {
        if (!product) return
        setQuantity((q) => Math.min(q + 1, product.quantity))
    }

    const decrease = () => {
        setQuantity((q) => Math.max(1, q - 1))
    }

    const handleAddToCart = async () => {
        if (!product) return

        setAdding(true)
        setAddError(null)
        clearError()

        const result = await addItem(product.id, quantity)

        setAdding(false)

        if (!result) {
            setAddError(storeError || "Unable to add to cart. Please try again.")
            return
        }

        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    const outOfStock = product ? product.quantity <= 0 : false

    return (
        <main className="container mx-auto px-4 py-10">
            <nav aria-label="Back to products">
                <Link
                    href="/products"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to products
                </Link>
            </nav>

            <div className="mt-8">
                {loading && <ProductDetailSkeleton />}

                {error && (
                    <div
                        role="alert"
                        className="flex flex-col items-center justify-center gap-3 py-20 text-center"
                    >
                        <AlertCircle className="h-12 w-12 text-destructive/60" aria-hidden="true" />
                        <p className="text-muted-foreground">Unable to load this product.</p>
                        <Button variant="outline" asChild>
                            <Link href="/products">Browse products</Link>
                        </Button>
                    </div>
                )}

                {!loading && !error && !product && (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                        <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                        <p className="text-muted-foreground">Product not found.</p>
                        <Button variant="outline" asChild>
                            <Link href="/products">Browse products</Link>
                        </Button>
                    </div>
                )}

                {product && (
                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        {/* Image */}
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    priority
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <PackageOpen className="h-16 w-16 text-muted-foreground/30" aria-hidden="true" />
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-col">
                            <div className="space-y-4">
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {product.name}
                                </h1>

                                <p className="text-3xl font-bold tabular-nums" aria-label={`Price: ${product.price.toFixed(2)} euros`}>
                                    {product.price.toFixed(2)}&nbsp;&euro;
                                </p>

                                <div>
                                    {outOfStock ? (
                                        <Badge variant="destructive">Out of stock</Badge>
                                    ) : product.quantity <= 5 ? (
                                        <Badge variant="outline">Only {product.quantity} left</Badge>
                                    ) : (
                                        <Badge variant="secondary">In stock</Badge>
                                    )}
                                </div>
                            </div>

                            {product.description && (
                                <>
                                    <Separator className="my-6" />
                                    <div className="space-y-1">
                                        <h2 className="text-sm font-medium text-muted-foreground">Description</h2>
                                        <p className="text-sm leading-relaxed">
                                            {product.description}
                                        </p>
                                    </div>
                                </>
                            )}

                            <Separator className="my-6" />

                            {/* Add to cart */}
                            <div className="space-y-4">
                                {!outOfStock && (
                                    <fieldset>
                                        <legend className="text-sm font-medium text-muted-foreground mb-2">
                                            Quantity
                                        </legend>
                                        <div className="inline-flex items-center rounded-lg border">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-r-none"
                                                onClick={decrease}
                                                disabled={quantity <= 1}
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                            <span
                                                className="flex h-10 w-12 items-center justify-center text-sm font-medium tabular-nums border-x"
                                                aria-live="polite"
                                                aria-label={`Quantity: ${quantity}`}
                                            >
                                                {quantity}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-l-none"
                                                onClick={increase}
                                                disabled={quantity >= product.quantity}
                                                aria-label="Increase quantity"
                                            >
                                                <Plus className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </fieldset>
                                )}

                                <Button
                                    size="lg"
                                    className="w-full sm:w-auto"
                                    onClick={handleAddToCart}
                                    disabled={adding || outOfStock || added}
                                    aria-live="polite"
                                >
                                    {adding ? (
                                        <>
                                            <ShoppingCart className="mr-2 h-4 w-4 animate-pulse" aria-hidden="true" />
                                            Adding...
                                        </>
                                    ) : added ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                                            Added to cart
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                                            {outOfStock ? "Out of stock" : `Add to cart`}
                                        </>
                                    )}
                                </Button>

                                {addError && (
                                    <p role="alert" className="text-sm text-destructive">
                                        {addError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
