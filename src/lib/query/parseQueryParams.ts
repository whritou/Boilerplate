import type { QueryParams } from './types'

/**
 * Parses URLSearchParams from a GET request into QueryParams
 * for use with BaseRepository.findMany().
 *
 * Supported params:
 *  - page, limit, sortBy, sortOrder, search
 *  - include (comma-separated)
 *  - Any other param is treated as a filter
 */
export function parseQueryParams(searchParams: URLSearchParams): QueryParams {
    const reserved = new Set(['page', 'limit', 'sortBy', 'sortOrder', 'search', 'include'])

    const params: QueryParams = {}

    const page = searchParams.get('page')
    if (page) params.page = Number(page)

    const limit = searchParams.get('limit')
    if (limit) params.limit = Number(limit)

    const sortBy = searchParams.get('sortBy')
    if (sortBy) params.sortBy = sortBy

    const sortOrder = searchParams.get('sortOrder')
    if (sortOrder === 'asc' || sortOrder === 'desc') params.sortOrder = sortOrder

    const search = searchParams.get('search')
    if (search) params.search = search

    const include = searchParams.get('include')
    if (include) params.include = include.split(',').map(s => s.trim())

    const filters: Record<string, string | boolean> = {}
    for (const [key, value] of searchParams.entries()) {
        if (!reserved.has(key) && value) {
            if (value === 'true') filters[key] = true
            else if (value === 'false') filters[key] = false
            else filters[key] = value
        }
    }
    if (Object.keys(filters).length > 0) {
        params.filters = filters
    }

    return params
}
