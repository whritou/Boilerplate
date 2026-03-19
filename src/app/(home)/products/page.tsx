"use client"

import { useState, useEffect, useRef } from "react"
import { useProducts } from "@/hooks/useProduct"
import { Button } from "@/components/ui/button"
import { Loader2, PackageOpen } from "lucide-react"
import type { ProductEntity } from "@/types/models/product"
import { ProductCard } from "@/components/products/ProductCard"
import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton"

const PER_PAGE = 12

export default function ProductsPage() {
    const [page, setPage] = useState(1)
    const [allProducts, setAllProducts] = useState<ProductEntity[]>([])
    const prevPageRef = useRef(0)

    const params = {
        isArchived: "false",
        page,
        limit: PER_PAGE,
    }

    const { products, meta, loading, isFresh, error } = useProducts(params)

    useEffect(() => {
        if (!isFresh || !products.length || page === prevPageRef.current) return
        prevPageRef.current = page

        setAllProducts((prev) => {
            const next = page === 1 ? products : [...prev, ...products]
            // Safety-net: deduplicate by id in case of concurrent renders
            const seen = new Set<string>()
            return next.filter((p) => {
                if (seen.has(p.id)) return false
                seen.add(p.id)
                return true
            })
        })
    }, [products, page, isFresh])

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
