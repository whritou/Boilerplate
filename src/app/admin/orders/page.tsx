"use client"

import { useState } from "react"
import { useOrders } from "@/hooks/useOrder"
import { useOrderStore } from "@/stores/order.store"
import type { OrderEntity } from "@/types/models/order"

import { DataTable, Column, TableToolbar, TablePagination } from "@/components/table/data-table"
import { CellAmount, CellMuted, CellStack } from "@/components/table/table-cells"
import { SearchInput } from "@/components/table/search-input"
import { FilterSelect } from "@/components/table/filter-select"
import DataState from "@/components/DataState"
import { Badge } from "@/components/ui/badge"

const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "canceled", label: "Canceled" },
]

const statusVariant = (status: string) => {
    switch (status) {
        case "pending": return "outline"
        case "confirmed": return "default"
        case "shipped": return "secondary"
        case "delivered": return "default"
        case "canceled": return "destructive"
        default: return "outline"
    }
}

const paymentVariant = (status: string) => {
    switch (status) {
        case "succeeded": return "default"
        case "processing": return "outline"
        case "canceled": return "destructive"
        case "requires_payment_method": return "outline"
        default: return "outline"
    }
}

export default function AdminOrdersPage() {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(20)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")

    const params: Record<string, string | number> = { page, limit: perPage }
    if (search) params.search = search
    if (statusFilter !== "all") params.status = statusFilter

    const { orders, meta, loading, error } = useOrders(params)
    const storeError = useOrderStore((s) => s.error)

    const columns: Column<OrderEntity>[] = [
        {
            key: "id",
            header: "ID",
            className: "w-[120px]",
            render: (row) => <CellMuted>{row.id.slice(0, 8)}...</CellMuted>,
        },
        {
            key: "user",
            header: "User",
            render: (row) => <CellMuted>{row.userId.slice(0, 8)}...</CellMuted>,
        },
        {
            key: "date",
            header: "Date",
            render: (row) => <CellMuted>{row.createdAt.toLocaleDateString("fr-FR")}</CellMuted>,
        },
        {
            key: "items",
            header: "Articles",
            className: "w-[80px]",
            render: (row) => <CellMuted>{row.items.length}</CellMuted>,
        },
        {
            key: "total",
            header: "Total",
            className: "w-[100px]",
            render: (row) => <CellAmount value={`${parseFloat(row.totalPrice).toFixed(2)} €`} />,
        },
        {
            key: "status",
            header: "Statut",
            className: "w-[120px]",
            render: (row) => (
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            ),
        },
        {
            key: "payment",
            header: "Payment",
            className: "w-[120px]",
            render: (row) => (
                <Badge variant={paymentVariant(row.paymentStatus)}>{row.paymentStatus}</Badge>
            ),
        },
    ]

    const state = (
        <DataState
            loading={loading}
            error={error || storeError}
            data={orders}
            loadingMessage="Loading orders..."
            errorMessage={error || storeError || undefined}
            emptyMessage="No order found"
        />
    )

    if (loading || (error && orders.length === 0) || (!loading && orders.length === 0)) {
        return (
            <div>
                <h1 className="text-2xl font-bold mb-6">Orders</h1>
                {state}
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Orders List</h1>

            {storeError && (
                <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {storeError}
                </div>
            )}

            <DataTable
                columns={columns}
                data={orders}
                rowKey={(row) => row.id}
                toolbar={
                    <TableToolbar count={meta?.total}>
                        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} className="w-64" />
                        <FilterSelect
                            value={statusFilter}
                            onChange={(v) => { setStatusFilter(v); setPage(1) }}
                            options={statusOptions}
                            placeholder="Statut"
                            className="w-[150px]"
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
        </div>
    )
}
