-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shipping_city" TEXT,
ADD COLUMN     "shipping_country" TEXT,
ADD COLUMN     "shipping_first_name" TEXT,
ADD COLUMN     "shipping_last_name" TEXT,
ADD COLUMN     "shipping_phone" TEXT,
ADD COLUMN     "shipping_street" TEXT,
ADD COLUMN     "shipping_zip_code" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
