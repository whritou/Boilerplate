"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useProducts } from "@/hooks/useProduct"
import DataState from "@/components/DataState"
import { TablePagination } from "@/components/table/data-table"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ProductsPage() {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(20)

    const params: Record<string, string | number> = { isArchived: "false", page, limit: perPage }
    const { products, meta, loading, error } = useProducts(params)

    const state = (
        <DataState
            loading={loading}
            error={error}
            data={products}
            loadingMessage="Chargement des produits..."
            errorMessage="Impossible de charger les produits."
            emptyMessage="Aucun produit disponible pour le moment."
        />
    )

    if (loading || error || products.length === 0) return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Nos produits</h1>
            {state}
        </div>
    )

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Nos produits</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
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
                                    <span className="text-muted-foreground text-sm">Pas d&#39;image</span>
                                </div>
                            )}

                            <CardContent className="flex flex-col gap-2">
                                <h2 className="font-semibold text-base line-clamp-1">{product.name}</h2>
                                {product.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                                )}
                            </CardContent>

                            <CardFooter className="flex items-center justify-between">
                                <span className="text-lg font-bold">{product.price.toFixed(2)} €</span>
                                {product.quantity <= 0 ? (
                                    <Badge variant="destructive">Rupture</Badge>
                                ) : product.quantity <= 5 ? (
                                    <Badge variant="outline">Stock faible</Badge>
                                ) : null}
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>

            {meta && (
                <div className="mt-8 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                    <TablePagination
                        page={page}
                        total={meta.total ?? 0}
                        perPage={perPage}
                        onChange={setPage}
                        onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
                    />
                </div>
            )}
        </div>
    )
}
