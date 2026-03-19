import { describe, it, expect, vi } from 'vitest'
import { createCrudStore } from '@/stores/createCRUD.store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PerfEntity {
    id: string
    name: string
    value: number
}

const mapOne = (dto: any): PerfEntity => ({
    id: dto.id,
    name: dto.name,
    value: dto.value,
})

const mapMany = (dtos: any[]): PerfEntity[] => dtos.map(mapOne)

function makeEntity(i: number): PerfEntity {
    return { id: `entity-${i}`, name: `Entity ${i}`, value: i }
}

function makeEntitiesRecord(count: number): Record<string, PerfEntity> {
    const record: Record<string, PerfEntity> = {}
    for (let i = 0; i < count; i++) {
        const e = makeEntity(i)
        record[e.id] = e
    }
    return record
}

// ---------------------------------------------------------------------------
// Performance: entity lookup after fetchMany with 1,000 entities
// ---------------------------------------------------------------------------

describe('Performance: CRUD store entity lookup', () => {
    it('looks up entities from a 1,000-entity store in under 10ms', () => {
        const store = createCrudStore<PerfEntity>('perf-entities', mapOne, mapMany)
        const entities = makeEntitiesRecord(1_000)

        store.setState({ entities })

        const start = performance.now()
        for (let i = 0; i < 1_000; i++) {
            const _ = store.getState().entities[`entity-${i}`]
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(10)
    })
})

// ---------------------------------------------------------------------------
// Performance: updateOne optimistic state update
// ---------------------------------------------------------------------------

describe('Performance: CRUD store updateOne optimistic update', () => {
    it('applies an optimistic update in under 5ms', () => {
        const store = createCrudStore<PerfEntity>('perf-update', mapOne, mapMany)
        store.setState({
            entities: { 'entity-0': makeEntity(0) },
        })

        // We test only the synchronous state update, not the fetch.
        // Call setState directly the same way updateOne does to measure overhead.
        const previous = store.getState().entities['entity-0']
        const data: Partial<PerfEntity> = { name: 'Updated' }

        const start = performance.now()
        store.setState((state) => ({
            entities: { ...state.entities, 'entity-0': { ...previous, ...data } },
            error: null,
        }))
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(5)
        expect(store.getState().entities['entity-0'].name).toBe('Updated')
    })
})

// ---------------------------------------------------------------------------
// Performance: deleteOne page update with 500 entities
// ---------------------------------------------------------------------------

describe('Performance: CRUD store deleteOne page update', () => {
    it('removes entity from pages with 500 items in under 10ms', () => {
        const store = createCrudStore<PerfEntity>('perf-delete', mapOne, mapMany)
        const entities = makeEntitiesRecord(500)
        const ids = Object.keys(entities)

        store.setState({
            entities,
            pages: { '{}': ids },
        })

        const idToDelete = 'entity-250'

        const start = performance.now()
        store.setState((state) => {
            const newEntities = { ...state.entities }
            delete newEntities[idToDelete]

            const pages = Object.fromEntries(
                Object.entries(state.pages).map(([k, pageIds]) => [
                    k,
                    pageIds.filter((i) => i !== idToDelete),
                ])
            )

            return { entities: newEntities, pages, error: null }
        })
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(10)
        expect(store.getState().entities[idToDelete]).toBeUndefined()
        expect(store.getState().pages['{}'].includes(idToDelete)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Performance: store initialization × 1,000
// ---------------------------------------------------------------------------

describe('Performance: CRUD store initialization', () => {
    it('creates 1,000 store instances in under 200ms', () => {
        const start = performance.now()
        for (let i = 0; i < 1_000; i++) {
            createCrudStore<PerfEntity>(`perf-init-${i}`, mapOne, mapMany)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(200)
    })
})
