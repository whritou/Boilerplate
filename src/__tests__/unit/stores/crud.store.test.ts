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

    it('fetchMany sets error on HTTP failure', async () => {
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

    it('fetchMany replaces generic "Forbidden"', async () => {
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

    it('fetchMany appends array params to query string', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } }),
        } as Response)

        await store.getState().fetchMany({ tags: ['a', 'b', 'c'] } as any)

        const calledUrl = fetchSpy.mock.calls[0][0] as string
        expect(calledUrl).toContain('tags=a')
        expect(calledUrl).toContain('tags=b')
        expect(calledUrl).toContain('tags=c')
    })

    it('fetchMany skips undefined param values', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } }),
        } as Response)

        await store.getState().fetchMany({ status: undefined } as any)

        const calledUrl = fetchSpy.mock.calls[0][0] as string
        expect(calledUrl).not.toContain('status')
    })

    it('fetchMany appends scalar params to query string', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: [], meta: { total: 0, page: 2, limit: 10 } }),
        } as Response)

        await store.getState().fetchMany({ page: 2, limit: 10, status: 'active' } as any)

        const calledUrl = fetchSpy.mock.calls[0][0] as string
        expect(calledUrl).toContain('page=2')
        expect(calledUrl).toContain('limit=10')
        expect(calledUrl).toContain('status=active')
    })

    it('fetchMany returns early when cache is still fresh', async () => {
        // Track all fetch calls with a single spy
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: [sampleDTO], meta: { total: 1, page: 1, limit: 20 } }),
        } as Response)

        // First call — hits the network
        await store.getState().fetchMany({})

        // Second call — cache is still fresh, should skip fetch
        await store.getState().fetchMany({})

        // fetch should have been called exactly once (for the first call only)
        expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('fetchOne stores a single entity', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: sampleDTO }),
        } as Response)

        await store.getState().fetchOne('entity-1')

        expect(store.getState().entities['entity-1'].name).toBe('Test')
    })

    it('fetchOne skips fetch when entity already cached and force is false', async () => {
        store.setState({ entities: { 'entity-1': mapOne(sampleDTO) } })
        const fetchSpy = vi.spyOn(global, 'fetch')

        await store.getState().fetchOne('entity-1')

        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('fetchOne sets error on HTTP failure', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ success: false, error: {} }),
        } as Response)

        await store.getState().fetchOne('entity-missing')

        expect(store.getState().error).toBe('Ressource not found')
        expect(store.getState().loading).toBe(false)
    })

    it('fetchOne sets error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))

        await store.getState().fetchOne('entity-1', true)

        expect(store.getState().error).toBe('Network error')
        expect(store.getState().loading).toBe(false)
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

    it('createOne returns null and sets error on network failure', async () => {
        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))

        const result = await store.getState().createOne({ name: 'Test' } as any)

        expect(result).toBeNull()
        expect(store.getState().error).toBe('Network error')
        // Optimistic entity should be rolled back
        expect(Object.keys(store.getState().entities).some((k) => k.startsWith('tmp-'))).toBe(false)
    })

    it('deleteOne removes entity and returns true', async () => {
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

    it('deleteOne returns false and restores entity on network error', async () => {
        const entity = mapOne(sampleDTO)
        store.setState({ entities: { 'entity-1': entity }, pages: { '{}': ['entity-1'] } })

        vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))

        const result = await store.getState().deleteOne('entity-1')

        expect(result).toBe(false)
        expect(store.getState().entities['entity-1']).toBeDefined()
        expect(store.getState().error).toBe('Network error')
    })

    it('deleteOne returns false when entity is not in store', async () => {
        const result = await store.getState().deleteOne('nonexistent')
        expect(result).toBe(false)
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

    describe('updateOne', () => {
        it('returns null when entity not in store', async () => {
            const result = await store.getState().updateOne('entity-1', { name: 'Updated' } as any)
            expect(result).toBeNull()
        })

        it('returns updated entity on success (HTTP 200)', async () => {
            store.setState({ entities: { 'entity-1': mapOne(sampleDTO) } })

            const updatedDTO = { ...sampleDTO, name: 'Updated' }
            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: updatedDTO }),
            } as Response)

            const result = await store.getState().updateOne('entity-1', { name: 'Updated' } as any)

            expect(result).not.toBeNull()
            expect(result?.name).toBe('Updated')
            expect(store.getState().entities['entity-1'].name).toBe('Updated')
            expect(store.getState().error).toBeNull()
        })

        it('returns null and rolls back on HTTP failure', async () => {
            const original = mapOne(sampleDTO)
            store.setState({ entities: { 'entity-1': original } })

            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ success: false, error: { message: 'Server error' } }),
            } as Response)

            const result = await store.getState().updateOne('entity-1', { name: 'Broken' } as any)

            expect(result).toBeNull()
            expect(store.getState().entities['entity-1'].name).toBe('Test')
            expect(store.getState().error).not.toBeNull()
        })

        it('returns null and rolls back on network error', async () => {
            const original = mapOne(sampleDTO)
            store.setState({ entities: { 'entity-1': original } })

            vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'))

            const result = await store.getState().updateOne('entity-1', { name: 'Broken' } as any)

            expect(result).toBeNull()
            expect(store.getState().entities['entity-1'].name).toBe('Test')
            expect(store.getState().error).toBe('Network error')
        })

        it('deduplication: fetchMany does not run while another fetch for same key is in-flight', async () => {
            let resolveFirst!: (value: Response) => void
            const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve })

            const fetchSpy = vi.spyOn(global, 'fetch')
                .mockReturnValueOnce(firstResponse)

            // Start both calls concurrently without awaiting immediately
            const p1 = store.getState().fetchMany({})
            const p2 = store.getState().fetchMany({})

            // Resolve the pending fetch so p1 can complete
            resolveFirst({
                ok: true,
                json: async () => ({
                    success: true,
                    data: [sampleDTO],
                    meta: { total: 1, page: 1, limit: 20 },
                }),
            } as Response)

            // Await both to ensure they are fully settled
            await Promise.all([p1, p2])

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })
    })
})
