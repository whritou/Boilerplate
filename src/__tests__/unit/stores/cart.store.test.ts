import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCartStore } from '@/stores/cart.store'
import type { CartDTO } from '@/types/models/cart'

const mockCartDTO: CartDTO = {
    id: 'cart-1',
    userId: 'user-1',
    items: [
        { id: 'item-1', productId: 'prod-1', quantity: 2, price: '10.00' },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
}

describe('useCartStore', () => {
    beforeEach(() => {
        useCartStore.setState({ cart: null, loading: false, error: null })
        vi.restoreAllMocks()
    })

    it('starts with null cart and no error', () => {
        const state = useCartStore.getState()
        expect(state.cart).toBeNull()
        expect(state.loading).toBe(false)
        expect(state.error).toBeNull()
    })

    it('fetchCart sets cart on success', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: mockCartDTO }),
        } as Response)

        await useCartStore.getState().fetchCart()

        const state = useCartStore.getState()
        expect(state.cart).not.toBeNull()
        expect(state.cart?.id).toBe('cart-1')
        expect(state.cart?.items).toHaveLength(1)
        expect(state.loading).toBe(false)
        expect(state.error).toBeNull()
    })

    it('fetchCart sets error on failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ success: false, error: { message: 'Forbidden' } }),
        } as Response)

        await useCartStore.getState().fetchCart()

        const state = useCartStore.getState()
        expect(state.cart).toBeNull()
        expect(state.error).toBe('You must be logged in to access cart')
        expect(state.loading).toBe(false)
    })

    it('fetchCart sets user-friendly error for network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fetch failed'))

        await useCartStore.getState().fetchCart()

        const state = useCartStore.getState()
        expect(state.error).toBe('Network error')
    })

    it('fetchCart sets fallback error when API returns no message', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({}),
        } as Response)

        await useCartStore.getState().fetchCart()

        const state = useCartStore.getState()
        expect(state.error).toBe('Server error, try again')
    })

    it('addItem returns updated cart on success', async () => {
        const updatedCart = { ...mockCartDTO, items: [...mockCartDTO.items, { id: 'item-2', productId: 'prod-2', quantity: 1, price: '5.00' }] }

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: updatedCart }),
        } as Response)

        const result = await useCartStore.getState().addItem('prod-2', 1)

        expect(result).not.toBeNull()
        expect(result?.items).toHaveLength(2)
    })

    it('addItem returns null and sets error on failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ success: false, error: { message: 'Insufficient stock' } }),
        } as Response)

        const result = await useCartStore.getState().addItem('prod-1', 999)

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Insufficient stock')
    })

    it('removeItem returns updated cart on success', async () => {
        const emptyCart = { ...mockCartDTO, items: [] }

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: emptyCart }),
        } as Response)

        const result = await useCartStore.getState().removeItem('item-1')

        expect(result).not.toBeNull()
        expect(result?.items).toHaveLength(0)
    })

    it('clearError resets error to null', () => {
        useCartStore.setState({ error: 'some error' })
        useCartStore.getState().clearError()
        expect(useCartStore.getState().error).toBeNull()
    })

    it('addItem returns null and sets Network error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fetch failed'))

        const result = await useCartStore.getState().addItem('prod-1', 1)

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Network error')
    })

    it('updateItem returns updated cart on success', async () => {
        const updatedCart = { ...mockCartDTO, items: [{ id: 'item-1', productId: 'prod-1', quantity: 5, price: '10.00' }] }

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: updatedCart }),
        } as Response)

        const result = await useCartStore.getState().updateItem('item-1', 5)

        expect(result).not.toBeNull()
        expect(result?.items[0].quantity).toBe(5)
    })

    it('updateItem returns null and sets error on HTTP failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ success: false, error: { message: 'Insufficient stock' } }),
        } as Response)

        const result = await useCartStore.getState().updateItem('item-1', 999)

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Insufficient stock')
    })

    it('updateItem returns null and sets Network error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fetch failed'))

        const result = await useCartStore.getState().updateItem('item-1', 2)

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Network error')
    })

    it('removeItem returns null and sets error on HTTP failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ success: false, error: { message: 'Item not found' } }),
        } as Response)

        const result = await useCartStore.getState().removeItem('item-1')

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Item not found')
    })

    it('removeItem returns null and sets Network error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fetch failed'))

        const result = await useCartStore.getState().removeItem('item-1')

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Network error')
    })

    it('clearCart returns cart on success', async () => {
        const emptyCart = { ...mockCartDTO, items: [] }

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: emptyCart }),
        } as Response)

        const result = await useCartStore.getState().clearCart()

        expect(result).not.toBeNull()
        expect(result?.items).toHaveLength(0)
    })

    it('clearCart returns null and sets error on HTTP failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ success: false, error: {} }),
        } as Response)

        const result = await useCartStore.getState().clearCart()

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Server error, try again')
    })

    it('clearCart returns null and sets Network error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fetch failed'))

        const result = await useCartStore.getState().clearCart()

        expect(result).toBeNull()
        expect(useCartStore.getState().error).toBe('Network error')
    })

    it('extractError falls back to HTTP status message when res.json() throws', async () => {
        // Simulate a response whose json() method rejects (malformed body)
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => { throw new SyntaxError('unexpected token') },
        } as unknown as Response)

        await useCartStore.getState().fetchCart()

        // Should fall back to the HTTP_ERROR_MESSAGES[500] fallback
        expect(useCartStore.getState().error).toBe('Server error, try again')
    })
})
