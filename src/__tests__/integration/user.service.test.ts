import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError, ConflictError } from '@/utils/errors'

vi.mock('@/repositories/user.repository', () => ({
    userRepository: {
        findMany: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        hardDelete: vi.fn(),
    },
}))

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed'),
        compare: vi.fn(),
    },
    hash: vi.fn().mockResolvedValue('hashed'),
    compare: vi.fn(),
}))

import { userService } from '@/services/user.service'
import { userRepository } from '@/repositories/user.repository'
import bcrypt from 'bcryptjs'

const mockRepo = userRepository as any
// bcrypt is the default export — it is { hash, compare } directly
const mockBcryptHash = bcrypt.hash as ReturnType<typeof vi.fn>
const mockBcryptCompare = bcrypt.compare as ReturnType<typeof vi.fn>

const sampleUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    password: 'hashed-pw',
    role: 'USER',
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
}

beforeEach(() => {
    vi.clearAllMocks()
    // Restore default resolved values that vi.clearAllMocks() resets
    mockBcryptHash.mockResolvedValue('hashed')
})

// ---------------------------------------------------------------------------
// getAll
// ---------------------------------------------------------------------------
describe('UserService.getAll', () => {
    it('delegates to userRepository.findMany with params', async () => {
        const params = { page: 1, limit: 10 }
        const expected = { data: [sampleUser], meta: {} }
        mockRepo.findMany.mockResolvedValue(expected)

        const result = await userService.getAll(params as any)

        expect(mockRepo.findMany).toHaveBeenCalledWith(params)
        expect(result).toBe(expected)
    })
})

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------
describe('UserService.getById', () => {
    it('returns user when found', async () => {
        mockRepo.findById.mockResolvedValue(sampleUser)
        const result = await userService.getById('user-1')
        expect(result).toEqual(sampleUser)
        expect(mockRepo.findById).toHaveBeenCalledWith('user-1')
    })

    it('throws NotFoundError when user does not exist', async () => {
        mockRepo.findById.mockResolvedValue(null)
        await expect(userService.getById('missing')).rejects.toThrow(NotFoundError)
    })
})

// ---------------------------------------------------------------------------
// getByEmail
// ---------------------------------------------------------------------------
describe('UserService.getByEmail', () => {
    it('returns user when found', async () => {
        mockRepo.findByEmail.mockResolvedValue(sampleUser)
        const result = await userService.getByEmail('alice@example.com')
        expect(result).toEqual(sampleUser)
        expect(mockRepo.findByEmail).toHaveBeenCalledWith('alice@example.com')
    })

    it('throws NotFoundError when user does not exist', async () => {
        mockRepo.findByEmail.mockResolvedValue(null)
        await expect(userService.getByEmail('ghost@example.com')).rejects.toThrow(NotFoundError)
    })
})

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('UserService.create', () => {
    it('hashes password and creates user when email is not taken', async () => {
        mockRepo.findByEmail.mockResolvedValue(null)
        mockRepo.create.mockResolvedValue({ ...sampleUser, password: 'hashed' })

        const result = await userService.create({
            email: 'alice@example.com',
            password: 'PlainPassword1!',
        } as any)

        expect(mockBcryptHash).toHaveBeenCalledWith('PlainPassword1!', 12)
        expect(mockRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ password: 'hashed' })
        )
        expect(result.password).toBe('hashed')
    })

    it('throws ConflictError when email is already in use', async () => {
        mockRepo.findByEmail.mockResolvedValue(sampleUser)

        await expect(
            userService.create({ email: 'alice@example.com', password: 'pw' } as any)
        ).rejects.toThrow(ConflictError)

        expect(mockRepo.create).not.toHaveBeenCalled()
    })

    it('does not hash password when no password is provided', async () => {
        mockRepo.findByEmail.mockResolvedValue(null)
        mockRepo.create.mockResolvedValue({ ...sampleUser, password: null })

        await userService.create({ email: 'alice@example.com' } as any)

        expect(mockBcryptHash).not.toHaveBeenCalled()
        expect(mockRepo.create).toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
describe('UserService.update', () => {
    it('hashes password when data.password is a string', async () => {
        const updated = { ...sampleUser, password: 'hashed' }
        mockRepo.update.mockResolvedValue(updated)

        const result = await userService.update('user-1', { password: 'NewPassword1!' } as any)

        expect(mockBcryptHash).toHaveBeenCalledWith('NewPassword1!', 12)
        expect(mockRepo.update).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({ password: 'hashed' })
        )
        expect(result).toEqual(updated)
    })

    it('does not hash password when data.password is not a plain string', async () => {
        const updated = { ...sampleUser, name: 'Bob' }
        mockRepo.update.mockResolvedValue(updated)

        await userService.update('user-1', { name: 'Bob' } as any)

        expect(mockBcryptHash).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when user does not exist', async () => {
        mockRepo.update.mockResolvedValue(null)
        await expect(userService.update('missing', { name: 'X' } as any)).rejects.toThrow(NotFoundError)
    })
})

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------
describe('UserService.delete', () => {
    it('hard-deletes the user when found', async () => {
        mockRepo.hardDelete.mockResolvedValue(true)
        await expect(userService.delete('user-1')).resolves.toBeUndefined()
        expect(mockRepo.hardDelete).toHaveBeenCalledWith('user-1')
    })

    it('throws NotFoundError when user does not exist', async () => {
        mockRepo.hardDelete.mockResolvedValue(false)
        await expect(userService.delete('missing')).rejects.toThrow(NotFoundError)
    })
})

// ---------------------------------------------------------------------------
// verifyPassword
// ---------------------------------------------------------------------------
describe('UserService.verifyPassword', () => {
    it('returns user when credentials are valid', async () => {
        mockRepo.findByEmail.mockResolvedValue(sampleUser)
        mockBcryptCompare.mockResolvedValue(true)

        const result = await userService.verifyPassword('alice@example.com', 'correct-pw')

        expect(result).toEqual(sampleUser)
        expect(mockBcryptCompare).toHaveBeenCalledWith('correct-pw', sampleUser.password)
    })

    it('returns null when password is wrong', async () => {
        mockRepo.findByEmail.mockResolvedValue(sampleUser)
        mockBcryptCompare.mockResolvedValue(false)

        const result = await userService.verifyPassword('alice@example.com', 'wrong-pw')
        expect(result).toBeNull()
    })

    it('returns null when user is not found', async () => {
        mockRepo.findByEmail.mockResolvedValue(null)

        const result = await userService.verifyPassword('ghost@example.com', 'pw')
        expect(result).toBeNull()
        expect(mockBcryptCompare).not.toHaveBeenCalled()
    })

    it('returns null when user has no password', async () => {
        mockRepo.findByEmail.mockResolvedValue({ ...sampleUser, password: null })

        const result = await userService.verifyPassword('alice@example.com', 'pw')
        expect(result).toBeNull()
        expect(mockBcryptCompare).not.toHaveBeenCalled()
    })
})
