import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCrudStore } from '@/stores/createCRUD.store'

interface TestEntity {
    id: string
    name: string
    createdAt: Date
}

const mapOne = (dto: any): TestEntity => ({
    id: dto.id,
    name: dto.name,
    createdAt: new Date(dto.createdAt),
})

const mapMany = (dtos: any[]): TestEntity[] => dtos.map(mapOne)

const sampleDTO = {
    id: 'entity-1',
    name: 'Test',
    createdAt: '2025-01-01T00:00:00.000Z',
}

describe('createCrudStore', () => {
    let store: ReturnType<typeof createCrudStore<TestEntity>>

    beforeEach(() => {
        store = createCrudStore<TestEntity>('test-entities', mapOne, mapMany)
        vi.restoreAllMocks()
    })

    it('starts with empty state', () => {
        const state = store.getState()
        expect(state.entities).toEqual({})
        expect(state.pages).toEqual({})
        expect(state.loading).toBe(false)
        expect(state.error).toBeNull()
    })

    it('fetchMany stores entities and page IDs', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: [sampleDTO, { ...sampleDTO, id: 'entity-2' }],
                meta: { total: 2, page: 1, limit: 20 },
            }),
        } as Response)

        await store.getState().fetchMany({})

        const state = store.getState()
        expect(Object.keys(state.entities)).toHaveLength(2)
        expect(state.entities['entity-1'].name).toBe('Test')
        expect(state.loading).toBe(false)
    })

    it('fetchMany sets error on HTTP failure with French message', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ success: false, error: {} }),
        } as Response)

        await store.getState().fetchMany({})

        const state = store.getState()
        expect(state.error).toBe('You must be logged in to access this ressource')
        expect(state.loading).toBe(false)
    })

    it('fetchMany replaces generic "Forbidden" with French message', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ success: false, error: { message: 'Forbidden' } }),
        } as Response)

        await store.getState().fetchMany({})

        expect(store.getState().error).toBe('You must be logged in to access this ressource')
    })

    it('fetchMany keeps custom API error messages', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ success: false, error: { message: 'Insufficient stock for "Widget"' } }),
        } as Response)

        await store.getState().fetchMany({})

        expect(store.getState().error).toBe('Insufficient stock for "Widget"')
    })

    it('fetchMany sets French error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))

        await store.getState().fetchMany({})

        expect(store.getState().error).toBe('Network error')
    })

    it('fetchOne stores a single entity', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: sampleDTO }),
        } as Response)

        await store.getState().fetchOne('entity-1')

        expect(store.getState().entities['entity-1'].name).toBe('Test')
    })

    it('createOne adds entity and returns it', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: sampleDTO }),
        } as Response)

        const result = await store.getState().createOne({ name: 'Test' } as any)

        expect(result).not.toBeNull()
        expect(result?.id).toBe('entity-1')
        expect(store.getState().entities['entity-1']).toBeDefined()
    })

    it('createOne returns null and sets error on failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 422,
            json: async () => ({ success: false, error: { message: 'Validation failed' } }),
        } as Response)

        const result = await store.getState().createOne({ name: '' } as any)

        expect(result).toBeNull()
        expect(store.getState().error).toBe('Invalid data')
    })

    it('deleteOne removes entity and returns true', async () => {
        // First add entity
        store.setState({
            entities: { 'entity-1': mapOne(sampleDTO) },
            pages: { '{}': ['entity-1'] },
        })

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response)

        const result = await store.getState().deleteOne('entity-1')

        expect(result).toBe(true)
        expect(store.getState().entities['entity-1']).toBeUndefined()
    })

    it('deleteOne restores entity on failure', async () => {
        const entity = mapOne(sampleDTO)
        store.setState({ entities: { 'entity-1': entity } })

        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: { message: 'Server error' } }),
        } as Response)

        const result = await store.getState().deleteOne('entity-1')

        expect(result).toBe(false)
        expect(store.getState().entities['entity-1']).toBeDefined()
    })

    it('clearError resets error', () => {
        store.setState({ error: 'some error' })
        store.getState().clearError()
        expect(store.getState().error).toBeNull()
    })

    it('invalidate clears cache', () => {
        store.setState({
            pages: { key: ['id'] },
            meta: { key: { total: 1 } },
            lastFetch: { key: Date.now() },
        })

        store.getState().invalidate()

        const state = store.getState()
        expect(state.pages).toEqual({})
        expect(state.meta).toEqual({})
        expect(state.lastFetch).toEqual({})
    })
})
