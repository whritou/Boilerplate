import { useEffect, useMemo } from "react"
import { useProductStore } from "@/stores/product.store"
import type { ProductEntity } from "@/types/models/product"

type QueryParams = Record<string, string | number | boolean | undefined>

export const useProduct = (id: string) => {
    const product = useProductStore((s) => s.entities[id])
    const fetchProduct = useProductStore((s) => s.fetchOne)
    const loading = useProductStore((s) => s.loading)
    const error = useProductStore((s) => s.error)

    useEffect(() => {
        if (!product) {
            fetchProduct(id)
        }
    }, [id, product, fetchProduct])

    return { product, loading, error }
}

export const useProducts = (params: QueryParams = {}) => {
    const key = JSON.stringify(params)

    const entities = useProductStore((s) => s.entities)
    const pages = useProductStore((s) => s.pages)
    const meta = useProductStore((s) => s.meta)

    const fetchMany = useProductStore((s) => s.fetchMany)
    const loading = useProductStore((s) => s.loading)
    const error = useProductStore((s) => s.error)

    useEffect(() => {
        fetchMany(params)
    }, [key, fetchMany])

    const products: ProductEntity[] = useMemo(() => {
        const ids = pages[key]
        if (!ids) return []

        return ids
            .map((id) => entities[id])
            .filter(Boolean) as ProductEntity[]
    }, [pages, entities, key])

    return {
        products,
        meta: meta[key],
        loading,
        error,
    }
}

export const useAllProducts = () => {
    const entities = useProductStore((s) => s.entities)
    return useMemo(() => Object.values(entities), [entities])
}
