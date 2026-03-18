import { prisma } from '@/lib/db/prisma'
import { BaseRepository, RepositoryConfig } from './base.repository'
import type { Payment, Prisma, PaymentStatus } from '@prisma/client'

class PaymentRepository extends BaseRepository<
    Payment,
    Prisma.PaymentCreateInput,
    Prisma.PaymentUpdateInput
> {
    protected get model() {
        return prisma.payment as any
    }

    protected get config(): RepositoryConfig {
        return {
            allowedSortFields: ['createdAt', 'amount', 'status'],
            allowedFilters:    ['status', 'orderId'],
            allowedIncludes:   ['order'],
            defaultSortField:  'createdAt',
        }
    }

    async findByStripePaymentIntentId(stripePaymentIntentId: string) {
        return prisma.payment.findFirst({
            where: { stripePaymentIntentId },
            include: { order: true },
        })
    }

    async updateStatus(id: string, status: PaymentStatus) {
        return prisma.payment.update({
            where: { id },
            data: { status },
        })
    }
}

export const paymentRepository = new PaymentRepository()
