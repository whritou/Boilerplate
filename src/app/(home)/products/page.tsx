"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useProducts } from "@/hooks/useProduct"
import DataState from "@/components/DataState"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ProductEntity } from "@/types/models/product"

const PER_PAGE = 20

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
        if (!products.length || page === prevPageRef.current) return
        prevPageRef.current = page

        setAllProducts((prev) =>
            page === 1 ? products : [...prev, ...products]
        )
    }, [products, page])

    const hasMore = meta ? allProducts.length < (meta.total ?? 0) : false
    const isInitialLoad = loading && page === 1

    if (isInitialLoad || error || (!loading && allProducts.length === 0)) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Our products</h1>
                <DataState
                    loading={isInitialLoad}
                    error={error}
                    data={allProducts}
                    loadingMessage="Loading the products..."
                    errorMessage="Impossible to load products."
                    emptyMessage="No product are available yet"
                />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Our products</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {allProducts.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`}>
                        <Card className="h-full transition-shadow hover:shadow-lg cursor-pointer">
                            {product.imageUrl ? (
                                <div className="relative w-full aspect-square">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover rounded-t-xl"
                                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    />
                                </div>
                            ) : (
                                <div className="w-full aspect-square bg-muted flex items-center justify-center rounded-t-xl">
                                    <span className="text-muted-foreground text-sm">No image</span>
                                </div>
                            )}

                            <CardContent className="flex flex-col gap-2">
                                <h2 className="font-semibold text-base line-clamp-1">
                                    {product.name}
                                </h2>
                                {product.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {product.description}
                                    </p>
                                )}
                            </CardContent>

                            <CardFooter className="flex items-center justify-between">
                                <span className="text-lg font-bold">
                                    {product.price.toFixed(2)} €
                                </span>
                                {product.quantity <= 0 ? (
                                    <Badge variant="destructive">Out of stock</Badge>
                                ) : product.quantity <= 5 ? (
                                    <Badge variant="outline">Low in stock</Badge>
                                ) : null}
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="flex justify-center mt-8">
                {hasMore && (
                    <Button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Load more"}
                    </Button>
                )}
            </div>
        </div>
    )
}
