import { useEffect, useMemo, useRef } from "react"
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

    const currentMeta = meta[key]

    // Keep previous results visible while loading new query
    const prevOrdersRef = useRef(orders)
    const prevMetaRef = useRef(currentMeta)
    if (orders.length > 0 || currentMeta) {
        prevOrdersRef.current = orders
        prevMetaRef.current = currentMeta
    }

    const hasDataForKey = !!pages[key]
    const isFetching = !hasDataForKey && !error

    return {
        orders: orders.length > 0 ? orders : prevOrdersRef.current,
        meta: currentMeta ?? prevMetaRef.current,
        loading: isFetching,
        error,
    }
}
