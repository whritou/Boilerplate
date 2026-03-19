import { create } from 'zustand'
import { fetchWithAuth } from '@/lib/api/fetchWithAuth'

type QueryParams = Record<
    string,
    string | number | boolean | string[] | undefined
>

interface Meta {
    total?: number
    page?: number
    limit?: number
}

interface Identifiable {
    id: string
}

export interface CrudState<T> {
    entities: Record<string, T>
    pages: Record<string, string[]>
    meta: Record<string, Meta>

    loading: boolean
    error: string | null

    lastFetch: Record<string, number>

    fetchMany: (params?: QueryParams) => Promise<void>
    fetchOne: (id: string, force?: boolean) => Promise<void>
    createOne: (data: Partial<T>) => Promise<T | null>
    updateOne: (id: string, data: Partial<T>) => Promise<T | null>
    deleteOne: (id: string) => Promise<boolean>

    clearError: () => void
    invalidate: () => void
}

const STALE_MS = 60_000

const HTTP_ERROR_MESSAGES: Record<number, string> = {
    400: 'Invalid request',
    401: 'You must be logged in',
    403: 'You must be logged in to access this ressource',
    404: 'Ressource not found',
    409: 'Data conflict',
    422: 'Invalid data',
    429: 'Too many request, please try again later',
    500: 'Server error, please try again',
}

const GENERIC_ERROR_NAMES = new Set([
    'Forbidden', 'Unauthorized', 'Not Found', 'Bad Request',
    'Conflict', 'Too Many Requests', 'Internal server error',
    'Internal Server Error', 'Validation failed',
])

/**
 * Extracts a meaningful error message from an API response.
 * Falls back to predefined HTTP messages when the API message is generic or missing.
 */
async function extractError(res: Response): Promise<string> {
    const fallback = HTTP_ERROR_MESSAGES[res.status] || `Erreur (${res.status})`

    try {
        const json = await res.json()
        const apiMessage = json?.error?.message

        if (!apiMessage || GENERIC_ERROR_NAMES.has(apiMessage)) {
            return fallback
        }

        return apiMessage
    } catch {
        return fallback
    }
}

/**
 * Factory to create a reusable CRUD Zustand store.
 *
 * Features:
 * - Normalized entity storage
 * - Query-based pagination cache
 * - Request deduplication
 * - Stale-while-revalidate caching (STALE_MS)
 * - Optimistic updates (create, update, delete)
 * - Centralized error handling
 */
export function createCrudStore<T extends Identifiable>(
    apiPath: string,
    mapOne: (data: any) => T,
    mapMany: (data: any[]) => T[]
) {
    const fetchingKeys = new Set<string>()

    return create<CrudState<T>>((set, get) => ({
        entities: {},
        pages: {},
        meta: {},

        loading: false,
        error: null,

        lastFetch: {},

        /**
         * Fetch a list of entities with optional query params.
         *
         * - Uses cache with TTL (STALE_MS)
         * - Prevents duplicate concurrent requests
         * - Stores normalized entities + page mapping
         */
        async fetchMany(params = {}) {
            const key = JSON.stringify(params)
            const last = get().lastFetch[key]

            if (last && Date.now() - last < STALE_MS) return
            if (fetchingKeys.has(key)) return

            fetchingKeys.add(key)
            set({ loading: true, error: null })

            try {
                const qs = new URLSearchParams()

                for (const [k, v] of Object.entries(params)) {
                    if (v === undefined) continue

                    if (Array.isArray(v)) {
                        v.forEach((val) => qs.append(k, String(val)))
                    } else {
                        qs.append(k, String(v))
                    }
                }

                const res = await fetchWithAuth(`/api/${apiPath}?${qs.toString()}`)

                if (!res.ok) {
                    const msg = await extractError(res)
                    set({ loading: false, error: msg })
                    return
                }

                const json = await res.json()
                const items = mapMany(json.data)

                set((state) => {
                    const entities = { ...state.entities }
                    const ids: string[] = []

                    for (const item of items as any[]) {
                        entities[item.id] = item
                        ids.push(item.id)
                    }

                    return {
                        entities,
                        pages: { ...state.pages, [key]: ids },
                        meta: { ...state.meta, [key]: json.meta },
                        lastFetch: { ...state.lastFetch, [key]: Date.now() },
                        loading: false,
                        error: null,
                    }
                })
            } catch {
                set({ loading: false, error: 'Network error' })
            } finally {
                fetchingKeys.delete(key)
            }
        },

        /**
         * Fetch a single entity by ID.
         *
         * - Skips request if already cached unless `force` is true
         * - Updates normalized entity store
         */
        async fetchOne(id, force) {
            if (!force && get().entities[id]) return

            set({ loading: true, error: null })

            try {
                const res = await fetch(`/api/${apiPath}/${id}`)

                if (!res.ok) {
                    const msg = await extractError(res)
                    set({ loading: false, error: msg })
                    return
                }

                const json = await res.json()

                set((state) => ({
                    loading: false,
                    entities: {
                        ...state.entities,
                        [id]: mapOne(json.data),
                    },
                }))
            } catch {
                set({ loading: false, error: 'Network error' })
            }
        },

        /**
         * Create a new entity with optimistic update.
         *
         * - Inserts temporary entity
         * - Replaces it with server response
         * - Rolls back on failure
         */
        async createOne(data) {
            const tmpId = `tmp-${Date.now()}`
            const optimistic: T = { id: tmpId, ...data } as T

            set((state) => ({
                entities: { ...state.entities, [tmpId]: optimistic },
                error: null,
            }))

            try {
                const res = await fetch(`/api/${apiPath}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })

                if (!res.ok) {
                    const msg = await extractError(res)

                    set((state) => {
                        const entities = { ...state.entities }
                        delete entities[tmpId]
                        return { entities, error: msg }
                    })

                    return null
                }

                const json = await res.json()
                const created = mapOne(json.data)

                set((state) => {
                    const entities = { ...state.entities }
                    delete entities[tmpId]
                    entities[created.id] = created
                    return { entities, error: null }
                })

                return created
            } catch {
                set((state) => {
                    const entities = { ...state.entities }
                    delete entities[tmpId]
                    return { entities, error: 'Network error' }
                })
                return null
            }
        },

        /**
         * Update an entity with optimistic update.
         *
         * - Applies local update immediately
         * - Syncs with server response
         * - Rolls back on failure
         */
        async updateOne(id, data) {
            const previous = get().entities[id]
            if (!previous) return null

            set((state) => ({
                entities: { ...state.entities, [id]: { ...previous, ...data } },
                error: null,
            }))

            try {
                const res = await fetch(`/api/${apiPath}/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                })

                if (!res.ok) {
                    const msg = await extractError(res)

                    set((state) => ({
                        entities: { ...state.entities, [id]: previous },
                        error: msg,
                    }))
                    return null
                }

                const json = await res.json()
                const updated = mapOne(json.data)

                set((state) => ({
                    entities: { ...state.entities, [id]: updated },
                    error: null,
                }))

                return updated
            } catch {
                set((state) => ({
                    entities: { ...state.entities, [id]: previous },
                    error: 'Network error',
                }))
                return null
            }
        },

        /**
         * Delete an entity with optimistic removal.
         *
         * - Removes entity from store and all cached pages
         * - Restores it if request fails
         */
        async deleteOne(id) {
            const previous = get().entities[id]
            if (!previous) return false

            set((state) => {
                const entities = { ...state.entities }
                delete entities[id]

                const pages = Object.fromEntries(
                    Object.entries(state.pages).map(([k, ids]) => [
                        k,
                        ids.filter((i) => i !== id),
                    ])
                )

                return { entities, pages, error: null }
            })

            try {
                const res = await fetch(`/api/${apiPath}/${id}`, { method: 'DELETE' })

                if (!res.ok) {
                    const msg = await extractError(res)

                    set((state) => ({
                        entities: { ...state.entities, [id]: previous },
                        error: msg,
                    }))
                    return false
                }

                return true
            } catch {
                set((state) => ({
                    entities: { ...state.entities, [id]: previous },
                    error: 'Network error',
                }))
                return false
            }
        },

        /**
         * Clears the current error state.
         */
        clearError() {
            set({ error: null })
        },

        /**
         * Invalidates all cached queries.
         * Forces future fetches to reload data.
         */
        invalidate() {
            set({
                pages: {},
                meta: {},
                lastFetch: {},
            })
        },
    }))
}