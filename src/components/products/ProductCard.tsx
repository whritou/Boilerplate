import type {ProductEntity} from "@/types/models/product";
import Link from "next/link";
import Image from "next/image";
import {PackageOpen} from "lucide-react";
import {Badge} from "@/components/ui/badge";

export function ProductCard({ product }: { product: ProductEntity }) {
    const outOfStock = product.quantity <= 0

    return (
        <Link
            href={`/products/${product.id}`}
            className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
            aria-label={`${product.name} - ${product.price} euros${outOfStock ? ", out of stock" : ""}`}
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
                            {product.price}&nbsp;&euro;
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