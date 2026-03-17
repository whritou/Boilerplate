// src/lib/query/QueryBuilder.ts
// QueryBuilder universel : pagination, filtres, tri, search, includes
// Compatible avec n'importe quel modèle Prisma

import type {
  QueryParams,
  PaginatedResult,
  FilterValue,
} from './types'

export class QueryBuilder {
  // ─── PAGINATION ────────────────────────────────────────────────────────────

  static getPaginationArgs(params: QueryParams) {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const skip = (page - 1) * limit

    return { skip, take: limit, page, limit }
  }

  static buildPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit)
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }
  }

  // ─── TRI ───────────────────────────────────────────────────────────────────

  static getOrderByArgs(
    params: QueryParams,
    allowedFields: string[],
    defaultField = 'createdAt'
  ) {
    const sortBy =
      params.sortBy && allowedFields.includes(params.sortBy)
        ? params.sortBy
        : defaultField

    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'

    // Support du tri sur champs imbriqués: "author.name" → { author: { name: 'asc' } }
    if (sortBy.includes('.')) {
      return { orderBy: QueryBuilder.buildNestedSort(sortBy, sortOrder) }
    }

    return { orderBy: { [sortBy]: sortOrder } }
  }

  private static buildNestedSort(path: string, order: 'asc' | 'desc'): object {
    const parts = path.split('.')
    return parts.reduceRight((acc, part) => ({ [part]: acc }), order as unknown as object)
  }

  // ─── FILTRES ───────────────────────────────────────────────────────────────

    static buildWhereArgs(
        params: QueryParams,
        allowedFilters: string[],
        searchConfig?: { fields: string[] },
        softDelete?: boolean,
        arrayFields?: string[]
    ) {
        const where: Record<string, unknown> = {}
        const andConditions: object[] = []
        const arrayFieldSet = new Set(arrayFields ?? [])

        if (params.filters) {
            for (const [key, value] of Object.entries(params.filters)) {
                if (!allowedFilters.includes(key) || value === undefined) continue
                const filterCondition = QueryBuilder.buildFilterCondition(key, value, arrayFieldSet.has(key))
                if (filterCondition) Object.assign(where, filterCondition)
            }
        }

        // ✓ Only inject deletedAt when the model actually has the column
        if (softDelete === true) {
            where.deletedAt = null
        }

        if (params.search && searchConfig?.fields.length) {
            const searchConditions = searchConfig.fields.map((field) => {
                if (field.includes('.')) return QueryBuilder.buildNestedSearch(field, params.search!)
                return { [field]: { contains: params.search, mode: 'insensitive' } }
            })
            andConditions.push({ OR: searchConditions })
        }

        if (andConditions.length > 0) where.AND = andConditions

        return { where }
    }

  private static buildFilterCondition(
    key: string,
    value: FilterValue,
    isArrayField = false,
  ): object | null {
    if (value === null) return { [key]: null }
    if (typeof value !== 'object') {
      // CSV string handling
      if (typeof value === 'string' && value.includes(',')) {
        const values = value.split(',').map(v => v.trim()).filter(Boolean)
        // For Prisma array fields (e.g. Flavor[], Technique[]) → hasSome
        if (isArrayField) return { [key]: { hasSome: values } }
        // For scalar/enum fields → in
        return { [key]: { in: values } }
      }
      // Single value on an array field → hasSome with single element
      if (isArrayField && typeof value === 'string') {
        return { [key]: { hasSome: [value] } }
      }
      return { [key]: value }
    }

    const prismaCondition: Record<string, unknown> = {}

    if ('eq' in value) prismaCondition.equals = value.eq
    if ('neq' in value) prismaCondition.not = value.neq
    if ('gt' in value) prismaCondition.gt = value.gt
    if ('gte' in value) prismaCondition.gte = value.gte
    if ('lt' in value) prismaCondition.lt = value.lt
    if ('lte' in value) prismaCondition.lte = value.lte
    if ('in' in value) prismaCondition.in = value.in
    if ('like' in value)
      return { [key]: { contains: value.like, mode: 'insensitive' } }
    if ('between' in value && value.between) {
      prismaCondition.gte = value.between[0]
      prismaCondition.lte = value.between[1]
    }

    return Object.keys(prismaCondition).length > 0
      ? { [key]: prismaCondition }
      : null
  }

  private static buildNestedSearch(path: string, search: string): object {
    const parts = path.split('.')
    const field = parts.pop()!
    const condition = { [field]: { contains: search, mode: 'insensitive' } }
    return parts.reduceRight((acc, part) => ({ [part]: acc }), condition as object)
  }

  // ─── INCLUDES ──────────────────────────────────────────────────────────────

  static buildIncludeArgs(
    params: QueryParams,
    allowedIncludes: string[]
  ) {
    if (!params.include?.length) return {}

    const includes: Record<string, unknown> = {}

    for (const includeStr of params.include) {
      if (!allowedIncludes.some((allowed) => includeStr.startsWith(allowed))) {
        continue // Sécurité : ignorer les includes non autorisés
      }

      const parts = includeStr.split('.')
      QueryBuilder.setNestedInclude(includes, parts)
    }

    return { include: includes }
  }

  private static setNestedInclude(
    obj: Record<string, unknown>,
    parts: string[]
  ) {
    const [first, ...rest] = parts
    if (rest.length === 0) {
      if (!obj[first]) obj[first] = true
    } else {
      if (!obj[first] || obj[first] === true) {
        obj[first] = { include: {} }
      }
      const nested = obj[first] as { include: Record<string, unknown> }
      QueryBuilder.setNestedInclude(nested.include, rest)
    }
  }

  // ─── MÉTHODE PRINCIPALE ────────────────────────────────────────────────────

    static build(
        params: QueryParams,
        config: {
            allowedSortFields: string[]
            allowedFilters:    string[]
            allowedIncludes:   string[]
            searchFields?:     string[]
            defaultSortField?: string
            softDelete?:       boolean
            arrayFields?:      string[]
        }
    ) {
        const { skip, take, page, limit } = QueryBuilder.getPaginationArgs(params)
        const { orderBy } = QueryBuilder.getOrderByArgs(
            params,
            config.allowedSortFields,
            config.defaultSortField
        )
        const { where } = QueryBuilder.buildWhereArgs(
            params,
            config.allowedFilters,
            { fields: config.searchFields ?? [] },
            config.softDelete,
            config.arrayFields
        )
        const { include } = QueryBuilder.buildIncludeArgs(params, config.allowedIncludes)

        return { skip, take, page, limit, orderBy, where, ...(include ? { include } : {}) }
    }
}
