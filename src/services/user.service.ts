import bcrypt from 'bcryptjs'
import { userRepository } from '@/repositories/user.repository'
import { NotFoundError, ConflictError } from '@/utils/errors'
import type { QueryParams } from '@/lib/query/types'
import type { Prisma } from '@prisma/client'

class UserService {
  async getAll(params: QueryParams) {
    return userRepository.findMany(params)
  }

  async getById(id: string) {
    const user = await userRepository.findById(id)
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async getByEmail(email: string) {
    const user = await userRepository.findByEmail(email)
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async create(data: Prisma.UserCreateInput) {
    const existing = await userRepository.findByEmail(data.email)
    if (existing) throw new ConflictError('Email already in use')

    if (data.password) {
      data = { ...data, password: await bcrypt.hash(data.password as string, 12) }
    }

    return userRepository.create(data)
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    if (data.password && typeof data.password === 'string') {
      data = { ...data, password: await bcrypt.hash(data.password, 12) }
    }
    const user = await userRepository.update(id, data)
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async delete(id: string) {
    const ok = await userRepository.hardDelete(id)
    if (!ok) throw new NotFoundError('User not found')
  }

    async verifyPassword(email: string, password: string) {
        const user = await userRepository.findByEmail(email)

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(password, user.password)

        if (!valid) return null

        return user
    }
}

export const userService = new UserService()
