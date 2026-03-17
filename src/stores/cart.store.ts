import { create } from 'zustand'
import { mapCart } from '@/lib/mappers/cart.mapper'
import type { CartEntity } from '@/types/models/cart'

interface CartState {
    cart: CartEntity | null
    loading: boolean
    error: string | null

    fetchCart: () => Promise<void>
    addItem: (productId: string, quantity: number) => Promise<CartEntity | null>
    updateItem: (itemId: string, quantity: number) => Promise<CartEntity | null>
    removeItem: (itemId: string) => Promise<CartEntity | null>
    clearCart: () => Promise<CartEntity | null>
    clearError: () => void
}

const HTTP_ERROR_MESSAGES: Record<number, string> = {
    400: 'Invalid request',
    401: 'You must be logged in',
    403: 'You must be logged in to access cart',
    404: 'Ressource not found',
    422: 'Invalid data',
    500: 'Server error, try again',
}

const GENERIC_ERROR_NAMES = new Set([
    'Forbidden', 'Unauthorized', 'Not Found', 'Bad Request',
    'Conflict', 'Too Many Requests', 'Internal server error',
    'Internal Server Error', 'Validation failed',
])

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

export const useCartStore = create<CartState>((set, get) => ({
    cart: null,
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    async fetchCart() {
        set({ loading: true, error: null })
        try {
            const res = await fetch('/api/cart')
            if (!res.ok) {
                const msg = await extractError(res)
                set({ loading: false, error: msg })
                return
            }
            const json = await res.json()
            set({ cart: mapCart(json.data), loading: false })
        } catch {
            set({ loading: false, error: 'Network error' })
        }
    },

    async addItem(productId, quantity) {
        set({ error: null })

        try {
            const res = await fetch('/api/cart/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity }),
            })

            if (!res.ok) {
                const msg = await extractError(res)
                set({ error: msg })
                return null
            }

            const json = await res.json()
            const cart = mapCart(json.data)

            set({ cart })

            return cart
        } catch {
            set({ error: 'Network error' })
            return null
        }
    },

    async updateItem(itemId, quantity) {
        set({ error: null })

        try {
            const res = await fetch(`/api/cart/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity }),
            })

            if (!res.ok) {
                const msg = await extractError(res)
                set({ error: msg })
                return null
            }

            const json = await res.json()
            const cart = mapCart(json.data)

            set({ cart })

            return cart
        } catch {
            set({ error: 'Network error' })
            return null
        }
    },

    async removeItem(itemId) {
        set({ error: null })

        try {
            const res = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' })

            if (!res.ok) {
                const msg = await extractError(res)
                set({ error: msg })
                return null
            }

            const json = await res.json()
            const cart = mapCart(json.data)

            set({ cart })

            return cart
        } catch {
            set({ error: 'Network error' })
            return null
        }
    },

    async clearCart(): Promise<CartEntity | null> {
        set({ error: null })

        try {
            const res = await fetch('/api/cart/clear', { method: 'POST' })

            if (!res.ok) {
                const msg = await extractError(res)
                set({ error: msg })
                return null
            }

            const json = await res.json()
            const cart = mapCart(json.data)

            set({ cart })

            return cart
        } catch {
            set({ error: 'Network error' })
            return null
        }
    }
}))
