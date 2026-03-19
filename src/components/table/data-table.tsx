"use client"

import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface Column<T> {
    key: string
    header: string
    className?: string
    headerClassName?: string
    render: (row: T) => ReactNode
}

interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    rowKey: (row: T) => string | number
    onRowClick?: (row: T) => void
    empty?: ReactNode
    toolbar?: ReactNode
    footer?: ReactNode
}

export function DataTable<T>({
                                 columns,
                                 data,
                                 rowKey,
                                 onRowClick,
                                 empty,
                                 toolbar,
                                 footer,
                             }: DataTableProps<T>) {

    const isEmpty = data.length === 0

    return (
        <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">

            {/* ✅ Toolbar ALWAYS visible */}
            {toolbar && (
                <div className="border-b border-border">
                    {toolbar}
                </div>
            )}

            {/* ✅ EMPTY MODE */}
            {isEmpty ? (
                <div className="flex items-center justify-center py-16">
                    {empty ?? <TableEmpty />}
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table>

                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    {columns.map((col) => (
                                        <TableHead
                                            key={col.key}
                                            className={cn(
                                                "px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                                                col.headerClassName
                                            )}
                                        >
                                            {col.header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {data.map((row) => (
                                    <TableRow
                                        key={rowKey(row)}
                                        onClick={() => onRowClick?.(row)}
                                        className={cn(
                                            "transition-colors",
                                            onRowClick && "cursor-pointer hover:bg-muted/40"
                                        )}
                                    >
                                        {columns.map((col) => (
                                            <TableCell
                                                key={col.key}
                                                className={cn("px-4 py-3 align-middle", col.className)}
                                            >
                                                {col.render(row)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>

                        </Table>
                    </div>

                    {/* ✅ Footer ONLY when data exists */}
                    {footer && (
                        <div className="border-t border-border bg-muted/30 px-4 py-3">
                            {footer}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export function TableEmpty({
  icon = "",
  title = "Table Empty",
  description,
}: {
  icon?: string
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="mb-3 text-3xl">{icon}</span>
      <p className="text-sm font-medium text-stone-500">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-stone-400">{description}</p>
      )}
    </div>
  )
}

export function TableToolbar({
  children,
  count,
}: {
  children: ReactNode
  count?: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      {children}
      {count !== undefined && (
        <span className="ml-auto text-[11px] text-stone-400">
          {count} result{count !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  )
}

interface PaginationProps {
    page: number
    total: number
    perPage: number
    onChange: (page: number) => void
    onPerPageChange?: (n: number) => void
}

export function TablePagination({
                                    page,
                                    total,
                                    perPage,
                                    onChange,
                                    onPerPageChange,
                                }: PaginationProps) {

    const totalPages = Math.max(1, Math.ceil(total / perPage))

    const from = total === 0 ? 0 : (page - 1) * perPage + 1
    const to = Math.min(page * perPage, total)

    return (
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">

            {/* LEFT — per page */}
            <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-xs text-muted-foreground">
                  Show
                </span>

                <Select
                    value={String(perPage)}
                    onValueChange={(v) => onPerPageChange?.(Number(v))}
                >
                    <SelectTrigger className="h-8 w-[70px] text-xs">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>

                <span className="text-xs text-muted-foreground">
                  per page
                </span>
            </div>

            {/* CENTER — results info */}
            <span className="text-xs text-muted-foreground text-center md:text-left">
                {from}-{to} on {total}
            </span>

            {/* RIGHT — navigation */}
            <div className="flex items-center justify-center md:justify-end gap-1">

                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onChange(1)}
                    disabled={page === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                  Page {page} / {totalPages}
                </span>

                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onChange(page + 1)}
                    disabled={page === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onChange(totalPages)}
                    disabled={page === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>

            </div>
        </div>
    )
}