"use client"

import { useState } from "react"
import Link from "next/link"
import type { OrderEntity } from "@/types/models/order"
import DataState from "@/components/DataState"
import { DataTable, Column, TablePagination } from "@/components/table/data-table"
import { CellAmount, CellMuted, CellStack } from "@/components/table/table-cells"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { useOrders } from "@/hooks/useOrder"
import { statusVariant, paymentVariant, paymentLabels} from "@/utils/orderStatus"

export default function UserOrdersPage() {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(20)

    const params: Record<string, string | number> = { page, limit: perPage, include: 'items,items.product' }
    const { orders, meta, loading, error } = useOrders(params)

    const columns: Column<OrderEntity>[] = [
        {
            key: "id",
            header: "order",
            render: (row) => <CellMuted>{row.id.slice(0, 8)}...</CellMuted>,
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
            render: (row) => <CellAmount value={`${parseFloat(row.totalPrice).toFixed(2)} €`} />,
        },
        {
            key: "status",
            header: "Statut",
            render: (row) => (
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            ),
        },
        {
            key: "payment",
            header: "Payment",
            render: (row) => (
                <Badge variant={paymentVariant(row.paymentStatus)}>
                    {paymentLabels[row.paymentStatus] || row.paymentStatus}
                </Badge>
            ),
        },
        {
            key: "actions",
            header: "",
            className: "w-[80px] text-right",
            render: (row) => (
                <Link href={`/checkout/${row.id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            ),
        },
    ]

    const state = (
        <DataState
            loading={loading}
            error={error}
            data={orders}
            loadingMessage="Loading the orders..."
            errorMessage={error || undefined}
            emptyMessage="No order yet"
        />
    )

    if (loading || error || orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">My orders</h1>
                {state}
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">My orders</h1>
            <DataTable
                columns={columns}
                data={orders}
                rowKey={(row) => row.id}
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
