"use client"

import { use, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useProduct } from "@/hooks/useProduct"
import DataState from "@/components/DataState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/stores/cart.store"

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { product, loading, error } = useProduct(id)
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)
    const [added, setAdded] = useState(false)

    const addItem = useCartStore((s) => s.addItem)
    const storeError = useCartStore((s) => s.error)
    const clearError = useCartStore((s) => s.clearError)

    const handleAddToCart = async () => {
        if (!product) return

        setAdding(true)
        setAddError(null)
        clearError()

        const result = await addItem(product.id, 1)

        setAdding(false)

        if (!result) {
            setAddError(storeError || "Erreur lors de l'ajout au panier.")
            return
        }

        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    const items = product ? [product] : []

    if (loading || error || !product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" /> Retour aux produits
                </Link>
                <DataState
                    loading={loading}
                    error={error}
                    data={items}
                    loadingMessage="Chargement du produit..."
                    errorMessage="Impossible de charger ce produit."
                    emptyMessage="Produit introuvable."
                />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-4 h-4" /> Retour aux produits
            </Link>

            <div className="grid md:grid-cols-2 gap-8 mt-4">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
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
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-muted-foreground">Pas d'image</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <h1 className="text-3xl font-bold">{product.name}</h1>

                    <p className="text-3xl font-bold text-primary">{product.price.toFixed(2)} €</p>

                    <div className="flex items-center gap-2">
                        {product.quantity > 0 ? (
                            <Badge variant="secondary">
                                {product.quantity > 10 ? "En stock" : `Plus que ${product.quantity} en stock`}
                            </Badge>
                        ) : (
                            <Badge variant="destructive">Rupture de stock</Badge>
                        )}
                    </div>

                    {product.description && (
                        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                    )}

                    <div className="mt-4">
                        <Button
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={adding || product.quantity <= 0}
                            className="w-full sm:w-auto"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            {adding ? "Ajout..." : added ? "Ajouté !" : "Ajouter au panier"}
                        </Button>

                        {addError && (
                            <p className="text-sm text-destructive mt-2">{addError}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
