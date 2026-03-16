import { describe, it, expect } from 'vitest'
import { parseQueryParams } from '@/lib/query/parseQueryParams'

describe('parseQueryParams', () => {
    it('parses pagination params', () => {
        const params = new URLSearchParams('page=2&limit=20')
        const result = parseQueryParams(params)
        expect(result.page).toBe(2)
        expect(result.limit).toBe(20)
    })

    it('parses sort params', () => {
        const params = new URLSearchParams('sortBy=name&sortOrder=asc')
        const result = parseQueryParams(params)
        expect(result.sortBy).toBe('name')
        expect(result.sortOrder).toBe('asc')
    })

    it('ignores invalid sortOrder', () => {
        const params = new URLSearchParams('sortOrder=invalid')
        const result = parseQueryParams(params)
        expect(result.sortOrder).toBeUndefined()
    })

    it('parses search param', () => {
        const params = new URLSearchParams('search=widget')
        const result = parseQueryParams(params)
        expect(result.search).toBe('widget')
    })

    it('parses include as comma-separated', () => {
        const params = new URLSearchParams('include=items,items.product')
        const result = parseQueryParams(params)
        expect(result.include).toEqual(['items', 'items.product'])
    })

    it('puts unknown params into filters and coerces booleans', () => {
        const params = new URLSearchParams('isArchived=false&status=active')
        const result = parseQueryParams(params)
        expect(result.filters).toEqual({ isArchived: false, status: 'active' })
    })

    it('coerces true string to boolean in filters', () => {
        const params = new URLSearchParams('isArchived=true')
        const result = parseQueryParams(params)
        expect(result.filters).toEqual({ isArchived: true })
    })

    it('returns empty object for no params', () => {
        const params = new URLSearchParams()
        const result = parseQueryParams(params)
        expect(result).toEqual({})
    })
})
