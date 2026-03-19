import { describe, it, expect } from 'vitest'
import { QueryBuilder } from '@/lib/query/QueryBuilder'

// ---------------------------------------------------------------------------
// Shared config used across multiple test cases
// ---------------------------------------------------------------------------

const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'price', 'status']
const allowedFilters = ['status', 'userId', 'price', 'category', 'isArchived']
const allowedIncludes = ['items', 'items.product', 'user', 'payment']
const searchFields = ['name', 'description', 'user.email']

// ---------------------------------------------------------------------------
// getPaginationArgs × 10,000
// ---------------------------------------------------------------------------

describe('Performance: QueryBuilder.getPaginationArgs', () => {
    it('runs 10,000 times in under 50ms', () => {
        const params = [
            { page: '1', limit: '20' },
            { page: '2', limit: '50' },
            { page: '10', limit: '100' },
            { page: '0', limit: '0' },       // boundary: clamps to page=1, limit=1
            { page: '-5', limit: '200' },     // boundary: clamps
        ]

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            QueryBuilder.getPaginationArgs(params[i % params.length])
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(50)
    })
})

// ---------------------------------------------------------------------------
// buildWhereArgs with complex filters × 1,000
// ---------------------------------------------------------------------------

describe('Performance: QueryBuilder.buildWhereArgs', () => {
    it('runs 1,000 times with complex filters in under 100ms', () => {
        const params = {
            page: '1',
            limit: '20',
            search: 'widget',
            filters: {
                status: 'confirmed',
                price: { gte: 10, lte: 100 },
                category: 'electronics,books',
                isArchived: false,
            },
        }

        const start = performance.now()
        for (let i = 0; i < 1_000; i++) {
            QueryBuilder.buildWhereArgs(
                params,
                allowedFilters,
                { fields: searchFields },
                true,
                ['category'],
            )
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(100)
    })

    it('handles null filter values in 1,000 iterations under 100ms', () => {
        const params = {
            page: '1',
            limit: '20',
            filters: {
                status: null,
                userId: 'user-abc',
            },
        }

        const start = performance.now()
        for (let i = 0; i < 1_000; i++) {
            QueryBuilder.buildWhereArgs(params, allowedFilters)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(100)
    })
})

// ---------------------------------------------------------------------------
// buildIncludeArgs with nested includes × 10,000
// ---------------------------------------------------------------------------

describe('Performance: QueryBuilder.buildIncludeArgs', () => {
    it('runs 10,000 times with nested includes in under 100ms', () => {
        const params = {
            page: '1',
            limit: '20',
            include: ['items', 'items.product', 'user', 'payment'],
        }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            QueryBuilder.buildIncludeArgs(params, allowedIncludes)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(100)
    })

    it('runs 10,000 times with no includes in under 100ms', () => {
        const params = { page: '1', limit: '20' }

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            QueryBuilder.buildIncludeArgs(params, allowedIncludes)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(100)
    })
})

// ---------------------------------------------------------------------------
// buildPaginatedResult × 10,000
// ---------------------------------------------------------------------------

describe('Performance: QueryBuilder.buildPaginatedResult', () => {
    it('runs 10,000 times in under 50ms', () => {
        const data = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` }))

        const start = performance.now()
        for (let i = 0; i < 10_000; i++) {
            QueryBuilder.buildPaginatedResult(data, 500, 1, 20)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(50)
    })

    it('correctly computes meta fields', () => {
        const result = QueryBuilder.buildPaginatedResult(['a', 'b', 'c'], 10, 2, 3)

        expect(result.meta.total).toBe(10)
        expect(result.meta.page).toBe(2)
        expect(result.meta.limit).toBe(3)
        expect(result.meta.totalPages).toBe(4)
        expect(result.meta.hasPreviousPage).toBe(true)
        expect(result.meta.hasNextPage).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// Full build() × 1,000
// ---------------------------------------------------------------------------

describe('Performance: QueryBuilder.build (full pipeline)', () => {
    it('runs 1,000 full builds in under 100ms', () => {
        const params = {
            page: '2',
            limit: '25',
            sortBy: 'price',
            sortOrder: 'asc' as const,
            search: 'laptop',
            include: ['items', 'items.product', 'user'],
            filters: {
                status: 'confirmed',
                price: { gte: 100, lte: 500 },
                isArchived: false,
            },
        }

        const config = {
            allowedSortFields,
            allowedFilters,
            allowedIncludes,
            searchFields,
            defaultSortField: 'createdAt',
            softDelete: true,
            arrayFields: [],
        }

        const start = performance.now()
        for (let i = 0; i < 1_000; i++) {
            QueryBuilder.build(params, config)
        }
        const elapsed = performance.now() - start

        expect(elapsed).toBeLessThan(100)
    })

    it('produces correct output structure', () => {
        const params = {
            page: '1',
            limit: '10',
            sortBy: 'name',
            sortOrder: 'desc' as const,
        }

        const config = {
            allowedSortFields,
            allowedFilters,
            allowedIncludes,
            searchFields: [],
            softDelete: false,
        }

        const result = QueryBuilder.build(params, config)

        expect(result.skip).toBe(0)
        expect(result.take).toBe(10)
        expect(result.page).toBe(1)
        expect(result.limit).toBe(10)
        expect(result.orderBy).toEqual({ name: 'desc' })
        expect(result.where).toBeDefined()
    })
})
