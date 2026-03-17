import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig } from './base.repository'
import type { User, Prisma } from '@prisma/client'

class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  protected get model() { return prisma.user as any }

  protected get config(): RepositoryConfig {
    return {
      allowedSortFields: ['name', 'email', 'createdAt', 'role'],
      allowedFilters: ['role'],
      allowedIncludes: ['accounts'],
      searchFields: ['name', 'email'],
      defaultSortField: 'createdAt',
    }
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }
}

export const userRepository = new UserRepository()
