-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "quantity" TEXT,
    "location" TEXT NOT NULL DEFAULT 'Kitchen',
    "daysLeft" INTEGER NOT NULL DEFAULT 7,
    "category" TEXT NOT NULL DEFAULT 'Food',
    "emoji" TEXT NOT NULL DEFAULT '📦',
    "barcode" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
