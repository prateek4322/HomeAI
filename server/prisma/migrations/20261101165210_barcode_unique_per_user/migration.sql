/*
  Warnings:

  - A unique constraint covering the columns `[userId,barcode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Product_barcode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_userId_barcode_key" ON "Product"("userId", "barcode");
