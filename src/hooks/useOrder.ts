import { useEffect, useMemo } from "react"
import { useOrderStore } from "@/stores/order.store"
import type { OrderEntity } from "@/types/models/order"

type QueryParams = Record<string, string | number | boolean | undefined>

export const useOrder = (id: string) => {
    const order = useOrderStore((s) => s.entities[id])
    const fetchOrder = useOrderStore((s) => s.fetchOne)
    const loading = useOrderStore((s) => s.loading)
    const error = useOrderStore((s) => s.error)

    useEffect(() => {
        if (!order) {
            fetchOrder(id)
        }
    }, [id, order, fetchOrder])

    return { order, loading, error }
}

export const useOrders = (params: QueryParams = {}) => {
    const key = JSON.stringify(params)

    const entities = useOrderStore((s) => s.entities)
    const pages = useOrderStore((s) => s.pages)
    const meta = useOrderStore((s) => s.meta)

    const fetchMany = useOrderStore((s) => s.fetchMany)
    const loading = useOrderStore((s) => s.loading)
    const error = useOrderStore((s) => s.error)

    useEffect(() => {
        fetchMany(params)
    }, [key, fetchMany])

    const orders: OrderEntity[] = useMemo(() => {
        const ids = pages[key]
        if (!ids) return []

        return ids
            .map((id) => entities[id])
            .filter(Boolean) as OrderEntity[]
    }, [pages, entities, key])

    return {
        orders,
        meta: meta[key],
        loading,
        error,
    }
}
