export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams {
  search?: string
  searchFields?: string[]
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
  include?: string[]
}

export interface QueryParams
  extends PaginationParams,
    SortParams,
    SearchParams,
    FilterParams,
    IncludeParams {
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
