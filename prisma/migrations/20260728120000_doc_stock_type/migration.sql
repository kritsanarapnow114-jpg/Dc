-- CreateEnum
CREATE TYPE "StockType" AS ENUM ('STOCK', 'NON_STOCK');

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN "stockType" "StockType" NOT NULL DEFAULT 'STOCK';
ALTER TABLE "Issue" ADD COLUMN "stockType" "StockType" NOT NULL DEFAULT 'STOCK';
