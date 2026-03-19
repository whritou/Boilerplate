import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseRepository } from '@/repositories/base.repository'
import type { RepositoryConfig } from '@/repositories/base.repository'
import { prisma } from '@/lib/db/prisma'

// ---------------------------------------------------------------------------
// Prisma mock — factory must not reference variables declared in this file
// (vi.mock is hoisted before any const declarations)
// ---------------------------------------------------------------------------

vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        $transaction: vi.fn(),
        test: { createMany: vi.fn() },
    },
}))

// ---------------------------------------------------------------------------
// Shared mock model object
// ---------------------------------------------------------------------------

const mockModel = {
    findMany:   vi.fn(),
    findUnique: vi.fn(),
    findFirst:  vi.fn(),
    create:     vi.fn(),
    update:     vi.fn(),
    delete:     vi.fn(),
    count:      vi.fn(),
    upsert:     vi.fn(),
}

// ---------------------------------------------------------------------------
// Concrete subclass — no softDelete
// ---------------------------------------------------------------------------

class TestRepository extends BaseRepository<any, any, any> {
    protected get model() { return mockModel }
    protected get config(): RepositoryConfig {
        return {
            allowedSortFields: ['name', 'createdAt'],
            allowedFilters:    ['status'],
            allowedIncludes:   ['items'],
            searchFields:      ['name'],
            defaultSortField:  'createdAt',
        }
    }
}

// ---------------------------------------------------------------------------
// Concrete subclass — with softDelete
// ---------------------------------------------------------------------------

class SoftDeleteRepository extends BaseRepository<any, any, any> {
    protected get model() { return mockModel }
    protected get config(): RepositoryConfig {
        return {
            allowedSortFields: ['name', 'createdAt'],
            allowedFilters:    ['status'],
            allowedIncludes:   [],
            searchFields:      ['name'],
            defaultSortField:  'createdAt',
            softDelete:        true,
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BaseRepository', () => {
    let repo: TestRepository
    let softRepo: SoftDeleteRepository

    beforeEach(() => {
        vi.clearAllMocks()
        repo = new TestRepository()
        softRepo = new SoftDeleteRepository()
    })

    // -------------------------------------------------------------------------
    // findMany
    // -------------------------------------------------------------------------

    describe('findMany', () => {
        it('delegates to model.findMany and returns paginated result', async () => {
            const rows = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
            mockModel.findMany.mockResolvedValue(rows)
            mockModel.count.mockResolvedValue(2)

            const result = await repo.findMany({})

            expect(mockModel.findMany).toHaveBeenCalled()
            expect(mockModel.count).toHaveBeenCalled()
            expect(result.data).toEqual(rows)
            expect(result.meta.total).toBe(2)
        })

        it('uses default page=1 and limit=20 when params are empty', async () => {
            mockModel.findMany.mockResolvedValue([])
            mockModel.count.mockResolvedValue(0)

            const result = await repo.findMany({})

            expect(result.meta.page).toBe(1)
            expect(result.meta.limit).toBe(20)
        })

        it('respects page and limit params', async () => {
            mockModel.findMany.mockResolvedValue([])
            mockModel.count.mockResolvedValue(100)

            const result = await repo.findMany({ page: 3, limit: 10 })

            expect(result.meta.page).toBe(3)
            expect(result.meta.limit).toBe(10)
        })
    })

    // -------------------------------------------------------------------------
    // findById
    // -------------------------------------------------------------------------

    describe('findById', () => {
        it('returns entity when found', async () => {
            const entity = { id: 'e-1', name: 'Widget' }
            mockModel.findUnique.mockResolvedValue(entity)

            const result = await repo.findById('e-1')

            expect(mockModel.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'e-1' }) }))
            expect(result).toEqual(entity)
        })

        it('returns null when not found', async () => {
            mockModel.findUnique.mockResolvedValue(null)

            const result = await repo.findById('missing')

            expect(result).toBeNull()
        })
    })

    // -------------------------------------------------------------------------
    // findOne
    // -------------------------------------------------------------------------

    describe('findOne', () => {
        it('delegates to model.findFirst with where clause', async () => {
            const entity = { id: 'e-1', name: 'Widget' }
            mockModel.findFirst.mockResolvedValue(entity)

            const result = await repo.findOne({ name: 'Widget' })

            expect(mockModel.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ name: 'Widget' }) }),
            )
            expect(result).toEqual(entity)
        })
    })

    // -------------------------------------------------------------------------
    // create
    // -------------------------------------------------------------------------

    describe('create', () => {
        it('calls model.create with data', async () => {
            const created = { id: 'new-1', name: 'New' }
            mockModel.create.mockResolvedValue(created)

            const result = await repo.create({ name: 'New' })

            expect(mockModel.create).toHaveBeenCalledWith({ data: { name: 'New' } })
            expect(result).toEqual(created)
        })
    })

    // -------------------------------------------------------------------------
    // createMany
    // -------------------------------------------------------------------------

    describe('createMany', () => {
        it('delegates to the named model createMany on prisma', async () => {
            // getModelName() returns constructor.name.replace('Repository','').toLowerCase()
            // TestRepository → 'test'
            const mockPrisma = prisma as unknown as Record<string, any>
            mockPrisma['test'] = {
                createMany: vi.fn().mockResolvedValue({ count: 2 }),
            }

            const result = await repo.createMany([{ name: 'A' }, { name: 'B' }])

            expect(result.count).toBe(2)
        })
    })

    // -------------------------------------------------------------------------
    // update
    // -------------------------------------------------------------------------

    describe('update', () => {
        it('returns updated entity on success', async () => {
            const updated = { id: 'e-1', name: 'Updated' }
            mockModel.update.mockResolvedValue(updated)

            const result = await repo.update('e-1', { name: 'Updated' })

            expect(mockModel.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ id: 'e-1' }) }),
            )
            expect(result).toEqual(updated)
        })

        it('returns null when record not found (Prisma throws)', async () => {
            mockModel.update.mockRejectedValue(new Error('Record not found'))

            const result = await repo.update('missing', { name: 'X' })

            expect(result).toBeNull()
        })
    })

    // -------------------------------------------------------------------------
    // softDelete
    // -------------------------------------------------------------------------

    describe('softDelete', () => {
        it('throws Error when softDelete config is not set', async () => {
            await expect(repo.softDelete('e-1')).rejects.toThrow(
                /softDelete\(\) called on TestRepository/,
            )
        })

        it('calls model.update with deletedAt when softDelete=true', async () => {
            mockModel.update.mockResolvedValue({ id: 'e-1', deletedAt: new Date() })

            const result = await softRepo.softDelete('e-1')

            expect(mockModel.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 'e-1' }),
                    data: expect.objectContaining({ deletedAt: expect.any(Date) }),
                }),
            )
            expect(result).toBe(true)
        })

        it('returns false when Prisma throws (record not found or already deleted)', async () => {
            mockModel.update.mockRejectedValue(new Error('Record not found'))

            const result = await softRepo.softDelete('missing')

            expect(result).toBe(false)
        })
    })

    // -------------------------------------------------------------------------
    // hardDelete
    // -------------------------------------------------------------------------

    describe('hardDelete', () => {
        it('returns true on success', async () => {
            mockModel.delete.mockResolvedValue({})

            const result = await repo.hardDelete('e-1')

            expect(mockModel.delete).toHaveBeenCalledWith({ where: { id: 'e-1' } })
            expect(result).toBe(true)
        })

        it('returns false when Prisma throws', async () => {
            mockModel.delete.mockRejectedValue(new Error('Record not found'))

            const result = await repo.hardDelete('missing')

            expect(result).toBe(false)
        })
    })

    // -------------------------------------------------------------------------
    // restore
    // -------------------------------------------------------------------------

    describe('restore', () => {
        it('throws Error when softDelete config is not set', async () => {
            await expect(repo.restore('e-1')).rejects.toThrow(
                /restore\(\) called on TestRepository/,
            )
        })

        it('calls model.update with deletedAt=null when softDelete=true', async () => {
            const restored = { id: 'e-1', deletedAt: null }
            mockModel.update.mockResolvedValue(restored)

            const result = await softRepo.restore('e-1')

            expect(mockModel.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 'e-1' }),
                    data: { deletedAt: null },
                }),
            )
            expect(result).toEqual(restored)
        })

        it('returns null when Prisma throws during restore', async () => {
            mockModel.update.mockRejectedValue(new Error('Record not found'))

            const result = await softRepo.restore('missing')

            expect(result).toBeNull()
        })
    })

    // -------------------------------------------------------------------------
    // count
    // -------------------------------------------------------------------------

    describe('count', () => {
        it('delegates to model.count', async () => {
            mockModel.count.mockResolvedValue(7)

            const result = await repo.count({ status: 'active' })

            expect(mockModel.count).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) }),
            )
            expect(result).toBe(7)
        })
    })

    // -------------------------------------------------------------------------
    // exists
    // -------------------------------------------------------------------------

    describe('exists', () => {
        it('returns true when count > 0', async () => {
            mockModel.count.mockResolvedValue(1)

            const result = await repo.exists({ name: 'Widget' })

            expect(result).toBe(true)
        })

        it('returns false when count = 0', async () => {
            mockModel.count.mockResolvedValue(0)

            const result = await repo.exists({ name: 'Missing' })

            expect(result).toBe(false)
        })
    })

    // -------------------------------------------------------------------------
    // upsert
    // -------------------------------------------------------------------------

    describe('upsert', () => {
        it('delegates to model.upsert', async () => {
            const upserted = { id: 'e-1', name: 'Widget' }
            mockModel.upsert.mockResolvedValue(upserted)

            const result = await repo.upsert({ id: 'e-1' }, { name: 'Widget' }, { name: 'Widget' })

            expect(mockModel.upsert).toHaveBeenCalledWith({
                where:  { id: 'e-1' },
                create: { name: 'Widget' },
                update: { name: 'Widget' },
            })
            expect(result).toEqual(upserted)
        })
    })

    // -------------------------------------------------------------------------
    // transaction
    // -------------------------------------------------------------------------

    describe('transaction', () => {
        it('delegates to prisma.$transaction', async () => {
            const fn = vi.fn().mockResolvedValue('tx-result')
            const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>
            mockTransaction.mockResolvedValue('tx-result')

            const result = await repo.transaction(fn)

            expect(mockTransaction).toHaveBeenCalledWith(fn)
            expect(result).toBe('tx-result')
        })
    })
})
