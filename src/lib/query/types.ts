// src/lib/query/types.ts
// Types partagés pour le système de query (pagination, filtres, tri, search, includes)

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string // Cursor-based pagination alternative
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams {
  search?: string
  searchFields?: string[] // Champs où chercher
}

export interface FilterParams {
  filters?: Record<string, FilterValue>
}

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | { eq?: unknown; neq?: unknown; gt?: unknown; gte?: unknown; lt?: unknown; lte?: unknown; in?: unknown[]; like?: string; between?: [unknown, unknown] }

export interface IncludeParams {
  include?: string[] // ex: ['author', 'author.profile', 'comments']
}

export interface QueryParams
  extends PaginationParams,
    SortParams,
    SearchParams,
    FilterParams,
    IncludeParams {
  /** Extra Prisma where conditions injected by route handlers (e.g. relation filters) */
  extraWhere?: Record<string, unknown>
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export interface CursorPaginatedResult<T> {
  data: T[]
  meta: {
    nextCursor: string | null
    prevCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
