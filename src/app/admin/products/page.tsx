"use client"

import { useState, useCallback } from "react"
import { useProducts } from "@/hooks/useProduct"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useProductStore } from "@/stores/product.store"
import type { ProductEntity } from "@/types/models/product"

import { DataTable, Column, TableToolbar, TablePagination } from "@/components/table/data-table"
import { CellStack, CellAmount, CellMuted } from "@/components/table/table-cells"
import { SearchInput } from "@/components/table/search-input"
import { FilterSelect } from "@/components/table/filter-select"
import DataState from "@/components/DataState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { ProductFormDialog } from "@/components/products/ProductFormDialog"
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog"
import Image from "next/image";

const archivedOptions = [
    { value: "false", label: "Actifs" },
    { value: "true", label: "Archivés" },
]

export default function AdminProductsPage() {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(10)
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebouncedValue(search, 300)
    const [archivedFilter, setArchivedFilter] = useState("all")

    const params: Record<string, string | number> = { page, limit: perPage }
    if (debouncedSearch) params.search = debouncedSearch
    if (archivedFilter !== "all") params.isArchived = archivedFilter

    const { products, meta, loading, error } = useProducts(params)
    const storeError = useProductStore((s) => s.error)
    const clearError = useProductStore((s) => s.clearError)

    const [formOpen, setFormOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<ProductEntity | null>(null)
    const [deleteProduct, setDeleteProduct] = useState<ProductEntity | null>(null)

    const handleCreate = useCallback(() => {
        setEditProduct(null)
        setFormOpen(true)
        clearError()
    }, [clearError])

    const handleEdit = useCallback((product: ProductEntity) => {
        setEditProduct(product)
        setFormOpen(true)
        clearError()
    }, [clearError])

    const columns: Column<ProductEntity>[] = [
        {
            key: "name",
            header: "Product",
            render: (row) => (
                <CellStack
                    primary={row.name}
                    secondary={row.description ? row.description.slice(0, 60) + (row.description.length > 60 ? "..." : "") : undefined}
                />
            ),
        },
        {
            key: "imageUrl",
            header: "Image",
            render: (row) => {
                const src = row.imageUrl?.trim() || "/placeholder.svg"

                return (
                    <div className="relative w-[100px] h-[60px]">
                        <Image
                            src={src}
                            alt="product image"
                            fill
                            className="object-contain rounded-md"
                        />
                    </div>
                )
            }
        },
        {
            key: "price",
            header: "Price",
            className: "w-[100px]",
            render: (row) => <CellAmount value={`${row.price.toFixed(2)} €`} />,
        },
        {
            key: "quantity",
            header: "Stock",
            className: "w-[80px]",
            render: (row) => <CellMuted>{row.quantity}</CellMuted>,
        },
        {
            key: "status",
            header: "Statut",
            className: "w-[100px]",
            render: (row) => (
                <Badge variant={row.isArchived ? "secondary" : "default"}>
                    {row.isArchived ? "Archived" : "Available"}
                </Badge>
            ),
        },
        {
            key: "actions",
            header: "",
            className: "w-[100px] text-right",
            render: (row) => (
                <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(row) }}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteProduct(row) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
        },
    ]

    const state = <DataState loading={loading}
                             error={error || storeError} data={products}
                             loadingMessage="Loading products..."
                             errorMessage={error || storeError || "An error occurred"}
                             emptyMessage="No product found" />

    const isInitialLoad = loading && products.length === 0
    if (isInitialLoad || (error && products.length === 0)) {
        return (
            <div>
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Products</h1>
                    <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Add</Button>
                </div>
                {state}
                <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editProduct} />
            </div>
        )
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">Products List</h1>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>

            {storeError && (
                <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {storeError}
                </div>
            )}

            <DataTable
                columns={columns}
                data={products}
                rowKey={(row) => row.id}
                empty={
                    <DataState
                        loading={loading}
                        error={error || storeError}
                        data={products}
                        loadingMessage="Loading products..."
                        errorMessage={error || storeError || undefined}
                        emptyMessage="No product found"
                    />
                }
                toolbar={
                    <TableToolbar count={meta?.total}>
                        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} className="w-64" />
                        <FilterSelect
                            value={archivedFilter}
                            onChange={(v) => { setArchivedFilter(v); setPage(1) }}
                            options={archivedOptions}
                            placeholder="Statut"
                            className="w-[130px]"
                        />
                    </TableToolbar>
                }
                footer={
                    meta && (
                        <TablePagination
                            page={page}
                            total={meta.total ?? 0}
                            perPage={perPage}
                            onChange={setPage}
                            onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
                        />
                    )
                }
            />

            <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editProduct} />
            <DeleteProductDialog product={deleteProduct} onClose={() => setDeleteProduct(null)} />
        </div>
    )
}
