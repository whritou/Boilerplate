"use client"

import { useState } from "react"
import { useProductStore } from "@/stores/product.store"
import type { ProductEntity } from "@/types/models/product"

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog"

interface Props {
    product: ProductEntity | null
    onClose: () => void
}

export function DeleteProductDialog({ product, onClose }: Props) {
    const deleteOne = useProductStore((s) => s.deleteOne)
    const invalidate = useProductStore((s) => s.invalidate)
    const storeError = useProductStore((s) => s.error)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!product) return
        setDeleting(true)
        const ok = await deleteOne(product.id)
        setDeleting(false)

        if (ok) {
            invalidate()
            onClose()
        }
    }

    return (
        <AlertDialog open={!!product} onOpenChange={(open) => { if (!open) onClose() }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete the product</AlertDialogTitle>
                    <AlertDialogDescription>
                        Do you really want to delete <strong>{product?.name}</strong> ? This action is irreversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {storeError && (
                    <p className="text-sm text-destructive">{storeError}</p>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
