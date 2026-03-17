"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useProductStore } from "@/stores/product.store"
import { productCreateSchema, productUpdateSchema } from "@/validations/product.schema"
import type { ProductEntity } from "@/types/models/product"
import { ZodError } from "zod"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    FormField,
    TextInput,
    TextAreaInput,
    SelectInput,
    FieldError,
    NumberInput,
    fadeUp,
} from "@/components/FormPrimitives"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: ProductEntity | null
}

const initialForm = {
    name: "",
    description: "",
    imageUrl: "",
    price: 0,
    quantity: 0,
    isArchived: "false",
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
    const createOne = useProductStore((s) => s.createOne)
    const updateOne = useProductStore((s) => s.updateOne)

    const invalidate = useProductStore((s) => s.invalidate)
    const storeError = useProductStore((s) => s.error)
    const clearError = useProductStore((s) => s.clearError)

    const isEdit = !!product
    const [form, setForm] = useState(initialForm)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name,
                description: product.description ?? "",
                imageUrl: product.imageUrl ?? "",
                price: product.price,
                quantity: product.quantity,
                isArchived: String(product.isArchived),
            })
        } else {
            setForm(initialForm)
        }
        setErrors({})
        clearError()
    }, [product, open, clearError])

    const setField = (key: string) => (value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
        setErrors((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})
        clearError()

        const data = {
            name: form.name,
            description: form.description || null,
            imageUrl: form.imageUrl || null,
            price: form.price,
            quantity: form.quantity,
            isArchived: form.isArchived === "true",
        }

        try {
            const schema = isEdit ? productUpdateSchema : productCreateSchema
            schema.parse(data)
        } catch (err) {
            if (err instanceof ZodError) {
                const fieldErrors: Record<string, string> = {}
                for (const issue of err.issues) {
                    const key = issue.path[0] as string
                    if (!fieldErrors[key]) fieldErrors[key] = issue.message
                }
                setErrors(fieldErrors)
                return
            }
        }

        setSubmitting(true)

        let result
        if (isEdit && product) {
            result = await updateOne(product.id, data as any)
        } else {
            result = await createOne(data as any)
        }

        setSubmitting(false)

        if (result) {
            invalidate()
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                        className="flex flex-col gap-4"
                    >
                        <FormField label="Nom" id="name" error={errors.name} required>
                            <TextInput id="name" type="text" value={form.name} onChange={setField("name")} placeholder="Nom du produit" invalid={!!errors.name} />
                        </FormField>

                        <FormField label="Description" id="description" error={errors.description}>
                            <TextAreaInput id="description" value={form.description} onChange={setField("description")} placeholder="Description (optionnel)" invalid={!!errors.description} rows={3} />
                        </FormField>

                        <FormField label="Image URL" id="imageUrl" error={errors.imageUrl}>
                            <TextInput id="imageUrl" type="url" value={form.imageUrl} onChange={setField("imageUrl")} placeholder="https://..." invalid={!!errors.imageUrl} />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Prix" id="price" error={errors.price} required>
                                <NumberInput
                                    id="price"
                                    value={form.price}
                                    onChange={(v) => setForm(prev => ({ ...prev, price: v }))}
                                    placeholder="0.00"
                                    invalid={!!errors.price}
                                />
                            </FormField>

                            <FormField label="Quantité" id="quantity" error={errors.quantity} required>
                                <NumberInput
                                    id="quantity"
                                    value={form.quantity}
                                    onChange={(v) => setForm(prev => ({ ...prev, quantity: v }))}
                                    placeholder="0"
                                    invalid={!!errors.quantity}
                                />
                            </FormField>
                        </div>

                        {isEdit && (
                            <FormField label="Statut" id="isArchived" error={errors.isArchived}>
                                <SelectInput
                                    id="isArchived"
                                    value={form.isArchived}
                                    onChange={setField("isArchived")}
                                    options={[
                                        { value: "false", label: "Actif" },
                                        { value: "true", label: "Archivé" },
                                    ]}
                                    invalid={!!errors.isArchived}
                                />
                            </FormField>
                        )}

                        {storeError && (
                            <motion.div variants={fadeUp}>
                                <FieldError message={storeError} id="form-error" />
                            </motion.div>
                        )}
                    </motion.div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "En cours..." : isEdit ? "Modifier" : "Créer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
