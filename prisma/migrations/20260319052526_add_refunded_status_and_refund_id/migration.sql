-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'refunded';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stripe_refund_id" TEXT;
