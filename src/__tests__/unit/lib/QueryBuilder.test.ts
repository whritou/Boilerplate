import { describe, it, expect } from 'vitest'
import { QueryBuilder } from '@/lib/query/QueryBuilder'

// ---------------------------------------------------------------------------
// getPaginationArgs
// ---------------------------------------------------------------------------
describe('QueryBuilder.getPaginationArgs', () => {
    it('defaults to page=1 and limit=20', () => {
        const result = QueryBuilder.getPaginationArgs({})
        expect(result.page).toBe(1)
        expect(result.limit).toBe(20)
        expect(result.skip).toBe(0)
        expect(result.take).toBe(20)
    })

    it('clamps limit to a maximum of 100', () => {
        const result = QueryBuilder.getPaginationArgs({ limit: 999 })
        expect(result.limit).toBe(100)
        expect(result.take).toBe(100)
    })

    it('clamps page to a minimum of 1', () => {
        const result = QueryBuilder.getPaginationArgs({ page: -5 })
        expect(result.page).toBe(1)
    })

    it('calculates skip correctly (page=3, limit=10 → skip=20)', () => {
        const result = QueryBuilder.getPaginationArgs({ page: 3, limit: 10 })
        expect(result.skip).toBe(20)
        expect(result.take).toBe(10)
        expect(result.page).toBe(3)
    })
})

// ---------------------------------------------------------------------------
// buildPaginatedResult
// ---------------------------------------------------------------------------
describe('QueryBuilder.buildPaginatedResult', () => {
    it('computes totalPages as Math.ceil(total / limit)', () => {
        const result = QueryBuilder.buildPaginatedResult([], 25, 1, 10)
        expect(result.meta.totalPages).toBe(3)
    })

    it('hasNextPage is true when page < totalPages', () => {
        const result = QueryBuilder.buildPaginatedResult([], 30, 2, 10)
        expect(result.meta.hasNextPage).toBe(true)
    })

    it('hasNextPage is false when page equals totalPages', () => {
        const result = QueryBuilder.buildPaginatedResult([], 30, 3, 10)
        expect(result.meta.hasNextPage).toBe(false)
    })

    it('hasPreviousPage is false on page 1', () => {
        const result = QueryBuilder.buildPaginatedResult([], 30, 1, 10)
        expect(result.meta.hasPreviousPage).toBe(false)
    })

    it('hasPreviousPage is true on page 2', () => {
        const result = QueryBuilder.buildPaginatedResult([], 30, 2, 10)
        expect(result.meta.hasPreviousPage).toBe(true)
    })

    it('includes data and all meta fields', () => {
        const data = [{ id: '1' }]
        const result = QueryBuilder.buildPaginatedResult(data, 1, 1, 20)
        expect(result.data).toBe(data)
        expect(result.meta.total).toBe(1)
        expect(result.meta.page).toBe(1)
        expect(result.meta.limit).toBe(20)
    })
})

// ---------------------------------------------------------------------------
// getOrderByArgs
// ---------------------------------------------------------------------------
describe('QueryBuilder.getOrderByArgs', () => {
    const allowed = ['name', 'price', 'createdAt']

    it('uses defaultField when sortBy is not in the allowed list', () => {
        const result = QueryBuilder.getOrderByArgs({ sortBy: 'unknown' }, allowed, 'createdAt')
        expect(result.orderBy).toEqual({ createdAt: 'desc' })
    })

    it('uses a valid sortBy from the allowed list', () => {
        const result = QueryBuilder.getOrderByArgs({ sortBy: 'price' }, allowed, 'createdAt')
        expect(result.orderBy).toEqual({ price: 'desc' })
    })

    it('sortOrder defaults to desc', () => {
        const result = QueryBuilder.getOrderByArgs({ sortBy: 'name' }, allowed, 'createdAt')
        expect(result.orderBy).toEqual({ name: 'desc' })
    })

    it('accepts asc as sortOrder', () => {
        const result = QueryBuilder.getOrderByArgs({ sortBy: 'name', sortOrder: 'asc' }, allowed, 'createdAt')
        expect(result.orderBy).toEqual({ name: 'asc' })
    })

    it('handles nested sort with dot notation (e.g. "user.name")', () => {
        const result = QueryBuilder.getOrderByArgs(
            { sortBy: 'user.name', sortOrder: 'asc' },
            ['user.name'],
            'createdAt'
        )
        expect(result.orderBy).toEqual({ user: { name: 'asc' } })
    })
})

// ---------------------------------------------------------------------------
// buildWhereArgs
// ---------------------------------------------------------------------------
describe('QueryBuilder.buildWhereArgs', () => {
    it('returns empty where when params has no filters or search', () => {
        const { where } = QueryBuilder.buildWhereArgs({}, ['status'])
        expect(where).toEqual({})
    })

    it('filters with exact match for allowed fields', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { status: 'active' } },
            ['status']
        )
        expect(where).toEqual({ status: 'active' })
    })

    it('ignores unknown filter keys not in allowedFilters', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { secret: 'value', status: 'active' } },
            ['status']
        )
        expect(where).not.toHaveProperty('secret')
        expect(where).toHaveProperty('status', 'active')
    })

    it('adds search OR conditions across searchConfig fields', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { search: 'widget' },
            [],
            { fields: ['name', 'description'] }
        )
        expect(where.AND).toBeDefined()
        const andArr = where.AND as object[]
        expect(andArr[0]).toEqual({
            OR: [
                { name: { contains: 'widget', mode: 'insensitive' } },
                { description: { contains: 'widget', mode: 'insensitive' } },
            ],
        })
    })

    it('adds deletedAt: null when softDelete is true', () => {
        const { where } = QueryBuilder.buildWhereArgs({}, [], undefined, true)
        expect(where).toEqual({ deletedAt: null })
    })

    it('does not add deletedAt when softDelete is false', () => {
        const { where } = QueryBuilder.buildWhereArgs({}, [], undefined, false)
        expect(where).not.toHaveProperty('deletedAt')
    })

    it('handles gte operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { price: { gte: 10 } } },
            ['price']
        )
        expect(where).toEqual({ price: { gte: 10 } })
    })

    it('handles lte operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { price: { lte: 100 } } },
            ['price']
        )
        expect(where).toEqual({ price: { lte: 100 } })
    })

    it('handles gt operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { price: { gt: 5 } } },
            ['price']
        )
        expect(where).toEqual({ price: { gt: 5 } })
    })

    it('handles lt operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { price: { lt: 50 } } },
            ['price']
        )
        expect(where).toEqual({ price: { lt: 50 } })
    })

    it('handles eq operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { status: { eq: 'active' } } },
            ['status']
        )
        expect(where).toEqual({ status: { equals: 'active' } })
    })

    it('handles neq operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { status: { neq: 'deleted' } } },
            ['status']
        )
        expect(where).toEqual({ status: { not: 'deleted' } })
    })

    it('handles between operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { price: { between: [10, 50] } } },
            ['price']
        )
        expect(where).toEqual({ price: { gte: 10, lte: 50 } })
    })

    it('handles in operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { status: { in: ['active', 'pending'] } } },
            ['status']
        )
        expect(where).toEqual({ status: { in: ['active', 'pending'] } })
    })

    it('handles like operator filter', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { name: { like: 'widget' } } },
            ['name']
        )
        expect(where).toEqual({ name: { contains: 'widget', mode: 'insensitive' } })
    })

    it('comma-separated string filter produces an in array', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { status: 'active,pending' } },
            ['status']
        )
        expect(where).toEqual({ status: { in: ['active', 'pending'] } })
    })

    it('array field with comma-separated value produces hasSome', () => {
        const { where } = QueryBuilder.buildWhereArgs(
            { filters: { tags: 'sale,new' } },
            ['tags'],
            undefined,
            false,
            ['tags']
        )
        expect(where).toEqual({ tags: { hasSome: ['sale', 'new'] } })
    })
})

// ---------------------------------------------------------------------------
// buildIncludeArgs
// ---------------------------------------------------------------------------
describe('QueryBuilder.buildIncludeArgs', () => {
    it('returns empty object when no include is provided', () => {
        const result = QueryBuilder.buildIncludeArgs({}, ['items'])
        expect(result).toEqual({})
    })

    it('returns empty object when include array is empty', () => {
        const result = QueryBuilder.buildIncludeArgs({ include: [] }, ['items'])
        expect(result).toEqual({})
    })

    it('includes a single relation', () => {
        const result = QueryBuilder.buildIncludeArgs({ include: ['items'] }, ['items'])
        expect(result).toEqual({ include: { items: true } })
    })

    it('builds nested include for dot notation (items.product)', () => {
        const result = QueryBuilder.buildIncludeArgs(
            { include: ['items.product'] },
            ['items']
        )
        expect(result).toEqual({ include: { items: { include: { product: true } } } })
    })

    it('ignores disallowed includes and keeps allowed ones', () => {
        const result = QueryBuilder.buildIncludeArgs(
            { include: ['secret', 'items'] },
            ['items']
        )
        expect(result).toEqual({ include: { items: true } })
        expect((result as any).include).not.toHaveProperty('secret')
    })

    it('returns { include: {} } when all includes are disallowed', () => {
        const result = QueryBuilder.buildIncludeArgs(
            { include: ['secret'] },
            ['items']
        )
        expect(result).toEqual({ include: {} })
    })
})

// ---------------------------------------------------------------------------
// build (integration of all methods)
// ---------------------------------------------------------------------------
describe('QueryBuilder.build', () => {
    it('integrates pagination, order, where, and include into a single result', () => {
        const params = {
            page: 2,
            limit: 10,
            sortBy: 'price',
            sortOrder: 'asc' as const,
            search: 'widget',
            filters: { status: 'active' },
            include: ['items'],
        }

        const config = {
            allowedSortFields: ['price', 'createdAt'],
            allowedFilters: ['status'],
            allowedIncludes: ['items'],
            searchFields: ['name'],
            defaultSortField: 'createdAt',
            softDelete: true,
        }

        const result = QueryBuilder.build(params, config)

        expect(result.page).toBe(2)
        expect(result.skip).toBe(10)
        expect(result.take).toBe(10)
        expect(result.orderBy).toEqual({ price: 'asc' })
        expect(result.where).toHaveProperty('status', 'active')
        expect(result.where).toHaveProperty('deletedAt', null)
        expect(result.include).toEqual({ items: true })
    })

    it('returns no include key when no includes are requested', () => {
        const result = QueryBuilder.build(
            {},
            {
                allowedSortFields: ['createdAt'],
                allowedFilters: [],
                allowedIncludes: [],
            }
        )
        expect(result).not.toHaveProperty('include')
    })
})
