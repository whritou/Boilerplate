/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `carts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "cart_items_cartId_productId_idx" ON "cart_items"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");
