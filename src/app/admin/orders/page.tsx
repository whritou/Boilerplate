"use client"

import { useState } from "react"
import { useOrders } from "@/hooks/useOrder"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useOrderStore } from "@/stores/order.store"
import type { OrderEntity } from "@/types/models/order"

import { DataTable, Column, TableToolbar, TablePagination } from "@/components/table/data-table"
import { CellAmount, CellMuted, CellStack } from "@/components/table/table-cells"
import { SearchInput } from "@/components/table/search-input"
import { FilterSelect } from "@/components/table/filter-select"
import DataState from "@/components/DataState"
import { Badge } from "@/components/ui/badge"
import { OrderDetailsModal } from "@/components/orders/OrderDetailsModal"
import { statusOptions, statusVariant, paymentVariant, paymentLabels} from "@/utils/orderStatus"

export default function AdminOrdersPage() {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(20)
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebouncedValue(search, 300)
    const [statusFilter, setStatusFilter] = useState("all")

    const [selectedOrder, setSelectedOrder] = useState<OrderEntity | null>(null)
    const [open, setOpen] = useState(false)

    const params: Record<string, string | number> = { page, limit: perPage, include: 'items,items.product,user' }
    if (debouncedSearch) params.search = debouncedSearch
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
            render: (row) => (
                <CellStack
                    primary={row.user?.name ?? row.userId.slice(0, 8)}
                    secondary={row.user?.email}
                />
            ),
        },
        {
            key: "date",
            header: "Date",
            render: (row) => <CellMuted>{row.createdAt.toLocaleDateString("fr-FR")}</CellMuted>,
        },
        {
            key: "items",
            header: "Articles",
            render: (row) => (
                <CellStack
                    primary={`${row.items.length} article${row.items.length !== 1 ? "s" : ""}`}
                    secondary={row.items.map((i) => i.product?.name ?? i.productId.slice(0, 8)).join(", ")}
                />
            ),
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
                <Badge variant={paymentVariant(row.paymentStatus)}>
                    {paymentLabels[row.paymentStatus] || row.paymentStatus}
                </Badge>
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

    const isInitialLoad = loading && orders.length === 0
    if (isInitialLoad || (error && orders.length === 0)) {
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
                onRowClick={(row) => {
                    setSelectedOrder(row)
                    setOpen(true)
                }}
                empty={
                    <DataState
                        loading={loading}
                        error={error || storeError}
                        data={orders}
                        loadingMessage="Loading orders..."
                        errorMessage={error || storeError || undefined}
                        emptyMessage="No order found"
                    />
                }
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
            <OrderDetailsModal
                order={selectedOrder}
                open={open}
                onOpenChange={setOpen}
                onRefunded={(updatedOrder) => {
                    useOrderStore.setState((state) => ({
                        entities: { ...state.entities, [updatedOrder.id]: updatedOrder },
                    }))
                    setSelectedOrder(null)
                }}
            />
        </div>
    )
}
