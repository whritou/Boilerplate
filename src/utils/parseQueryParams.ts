import type { QueryParams, FilterValue } from '@/lib/query/types'

const RESERVED_KEYS = new Set([
  'page', 'limit', 'cursor',
  'sortBy', 'sortOrder',
  'search',
  'include',
  'minimal', 'fields',
])

export function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  const params: QueryParams = {}

  if (searchParams.has('page')) params.page = Number(searchParams.get('page'))
  if (searchParams.has('limit')) params.limit = Number(searchParams.get('limit'))
  if (searchParams.has('cursor')) params.cursor = searchParams.get('cursor') ?? undefined

  if (searchParams.has('sortBy')) params.sortBy = searchParams.get('sortBy') ?? undefined
  if (searchParams.has('sortOrder')) {
    const order = searchParams.get('sortOrder')
    params.sortOrder = order === 'asc' ? 'asc' : 'desc'
  }

  if (searchParams.has('search')) params.search = searchParams.get('search') ?? undefined

  // Includes: ?include=author&include=comments → ['author', 'comments']
  const includes = searchParams.getAll('include')
  if (includes.length > 0) params.include = includes

  // Filtres: ?filter[status]=ACTIVE&filter[role]=ADMIN
  const filters: Record<string, FilterValue> = {}
  for (const [key, value] of searchParams.entries()) {
    const match = key.match(/^filter\[(.+)\]$/)
    if (match) {
      const field = match[1]
      // Opérateurs: ?filter[age][gte]=18
      const opMatch = field.match(/^(.+)\[(.+)\]$/)
      if (opMatch) {
        const [, realField, op] = opMatch
        filters[realField] = { ...(filters[realField] as object), [op]: parseValue(value) }
      } else {
        filters[field] = parseValue(value)
      }
      continue
    }

    if (!RESERVED_KEYS.has(key) && !key.startsWith('filter[')) {
      filters[key] = parseValue(value)
    }
  }

  if (Object.keys(filters).length > 0) params.filters = filters

  return params
}

function parseValue(value: string): string | number | boolean | null {
  if (value === 'null') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (!isNaN(Number(value)) && value !== '') return Number(value)
  return value
}
