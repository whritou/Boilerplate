import { prisma } from '@/lib/db/prisma'
import { QueryBuilder } from '@/lib/query/QueryBuilder'
import type { QueryParams, PaginatedResult } from '@/lib/query/types'
import type { PrismaClient } from '@prisma/client'

export interface RepositoryConfig {
    allowedSortFields: string[]
    allowedFilters:    string[]
    allowedIncludes:   string[]
    searchFields?:     string[]
    defaultSortField?: string
    softDelete?:       boolean
    arrayFields?:      string[]
}

type PrismaDelegate = {
    findMany:   (args?: unknown) => Promise<unknown[]>
    findUnique: (args:  unknown) => Promise<unknown | null>
    findFirst:  (args?: unknown) => Promise<unknown | null>
    create:     (args:  unknown) => Promise<unknown>
    update:     (args:  unknown) => Promise<unknown>
    delete:     (args:  unknown) => Promise<unknown>
    count:      (args?: unknown) => Promise<number>
    upsert:     (args:  unknown) => Promise<unknown>
}

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
    protected abstract get model():  PrismaDelegate
    protected abstract get config(): RepositoryConfig

    // ✓ True only when the model schema actually has a deletedAt column
    private get hasSoftDelete(): boolean {
        return this.config.softDelete === true
    }

    // Returns { deletedAt: null } when the model supports it, otherwise {}
    private get softWhere(): object {
        return this.hasSoftDelete ? { deletedAt: null } : {}
    }

    // ─── FIND MANY avec pagination ─────────────────────────────────────────────

    async findMany(params: QueryParams = {}): Promise<PaginatedResult<T>> {
        const { skip, take, page, limit, orderBy, where, include } =
            QueryBuilder.build(params, this.config)

        // ✓ deletedAt injected only when the model has the column
        // ✓ extraWhere for relation filters injected by route handlers
        const baseWhere = { ...this.softWhere, ...where, ...(params.extraWhere ?? {}) }

        const [data, total] = await Promise.all([
            this.model.findMany({
                where: baseWhere,
                orderBy,
                skip,
                take,
                ...(include ? { include } : {}),
            }) as Promise<T[]>,
            this.model.count({ where: baseWhere }) as Promise<number>,
        ])

        return QueryBuilder.buildPaginatedResult(data, total, page, limit)
    }

    // ─── FIND BY ID ────────────────────────────────────────────────────────────

    async findById(id: string, include?: string[]): Promise<T | null> {
        const includeArgs = include
            ? QueryBuilder.buildIncludeArgs({ include }, this.config.allowedIncludes)
            : {}

        return this.model.findUnique({
            where: { id, ...this.softWhere },
            ...includeArgs,
        }) as Promise<T | null>
    }

    // ─── FIND ONE ──────────────────────────────────────────────────────────────

    async findOne(where: object): Promise<T | null> {
        return this.model.findFirst({
            where: { ...where, ...this.softWhere },
        }) as Promise<T | null>
    }

    // ─── CREATE ────────────────────────────────────────────────────────────────

    async create(data: CreateDTO): Promise<T> {
        return this.model.create({ data }) as Promise<T>
    }

    // ─── CREATE MANY ───────────────────────────────────────────────────────────

    async createMany(data: CreateDTO[]): Promise<{ count: number }> {
        const db = prisma as unknown as Record<
            string,
            { createMany: (args: unknown) => Promise<{ count: number }> }
        >
        return db[this.getModelName()].createMany({ data, skipDuplicates: true })
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────

    async update(id: string, data: UpdateDTO): Promise<T | null> {
        try {
            return await this.model.update({
                where: { id, ...this.softWhere },
                data,
            }) as T
        } catch {
            return null
        }
    }

    // ─── SOFT DELETE ───────────────────────────────────────────────────────────

    async softDelete(id: string): Promise<boolean> {
        if (!this.hasSoftDelete) {
            throw new Error(
                `softDelete() called on ${this.constructor.name} which has no deletedAt column. ` +
                `Use hardDelete() or set softDelete: true in the repository config.`
            )
        }
        try {
            await this.model.update({
                where: { id, deletedAt: null },
                data:  { deletedAt: new Date() },
            })
            return true
        } catch {
            return false
        }
    }

    // ─── HARD DELETE ───────────────────────────────────────────────────────────

    async hardDelete(id: string): Promise<boolean> {
        try {
            await this.model.delete({ where: { id } })
            return true
        } catch {
            return false
        }
    }

    // ─── RESTORE ───────────────────────────────────────────────────────────────

    async restore(id: string): Promise<T | null> {
        if (!this.hasSoftDelete) {
            throw new Error(
                `restore() called on ${this.constructor.name} which has no deletedAt column.`
            )
        }
        try {
            return await this.model.update({
                where: { id },
                data:  { deletedAt: null },
            }) as T
        } catch {
            return null
        }
    }

    // ─── UPSERT ────────────────────────────────────────────────────────────────

    async upsert(where: object, create: CreateDTO, update: UpdateDTO): Promise<T> {
        return this.model.upsert({ where, create, update }) as Promise<T>
    }

    // ─── COUNT ─────────────────────────────────────────────────────────────────

    async count(where: object = {}): Promise<number> {
        return this.model.count({
            where: { ...where, ...this.softWhere },
        }) as Promise<number>
    }

    // ─── EXISTS ────────────────────────────────────────────────────────────────

    async exists(where: object): Promise<boolean> {
        return (await this.count(where)) > 0
    }

    // ─── TRANSACTION ───────────────────────────────────────────────────────────

    async transaction<R>(
        fn: (
            tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
        ) => Promise<R>
    ): Promise<R> {
        return prisma.$transaction(fn)
    }

    // ─── INTERNAL ──────────────────────────────────────────────────────────────

    protected getModelName(): string {
        return this.constructor.name.replace('Repository', '').toLowerCase()
    }
}