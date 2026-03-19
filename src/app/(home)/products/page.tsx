"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useProducts } from "@/hooks/useProduct"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, PackageOpen } from "lucide-react"
import type { ProductEntity } from "@/types/models/product"

const PER_PAGE = 12

function ProductCardSkeleton() {
    return (
        <div className="group rounded-xl border bg-card text-card-foreground overflow-hidden">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            </div>
        </div>
    )
}

function ProductCard({ product }: { product: ProductEntity }) {
    const outOfStock = product.quantity <= 0

    return (
        <Link
            href={`/products/${product.id}`}
            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
            aria-label={`${product.name} - ${product.price.toFixed(2)} euros${outOfStock ? ", out of stock" : ""}`}
        >
            <article className="h-full rounded-xl border bg-card text-card-foreground overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:border-foreground/20">
                <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.imageUrl ? (
                        <Image
                            src={product.imageUrl || "placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <PackageOpen className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                        </div>
                    )}
                    {outOfStock && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Badge variant="destructive">Out of stock</Badge>
                        </div>
                    )}
                </div>

                <div className="p-4 space-y-2">
                    <h2 className="font-semibold leading-tight line-clamp-1">
                        {product.name}
                    </h2>
                    {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {product.description}
                        </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-bold tabular-nums">
                            {product.price.toFixed(2)}&nbsp;&euro;
                        </span>
                        {!outOfStock && product.quantity <= 5 && (
                            <Badge variant="outline">
                                {product.quantity} left
                            </Badge>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    )
}

export default function ProductsPage() {
    const [page, setPage] = useState(1)
    const [allProducts, setAllProducts] = useState<ProductEntity[]>([])
    const prevPageRef = useRef(0)

    const params = {
        isArchived: "false",
        page,
        limit: PER_PAGE,
    }

    const { products, meta, loading, error } = useProducts(params)

    useEffect(() => {
        if (!products.length || loading || page === prevPageRef.current) return
        prevPageRef.current = page

        setAllProducts((prev) =>
            page === 1 ? products : [...prev, ...products]
        )
    }, [products, page, loading])

    const total = meta?.total ?? 0
    const hasMore = allProducts.length < total
    const isInitialLoad = loading && page === 1 && allProducts.length === 0

    return (
        <main className="container mx-auto px-4 py-10">
            <div className="mb-8 space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                {!isInitialLoad && !error && (
                    <p className="text-muted-foreground">
                        {total} product{total !== 1 ? "s" : ""} available
                    </p>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive"
                >
                    Unable to load products. Please try again later.
                </div>
            )}

            {isInitialLoad && (
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                    aria-busy="true"
                    aria-label="Loading products"
                >
                    {Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {!isInitialLoad && !error && allProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                    <p className="text-muted-foreground">No products available yet.</p>
                </div>
            )}

            {allProducts.length > 0 && (
                <>
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                        role="list"
                        aria-label="Product list"
                    >
                        {allProducts.map((product) => (
                            <div key={product.id} role="listitem">
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center pt-10">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={loading}
                                aria-label="Load more products"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                        Loading...
                                    </>
                                ) : (
                                    `Show more products`
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </main>
    )
}
