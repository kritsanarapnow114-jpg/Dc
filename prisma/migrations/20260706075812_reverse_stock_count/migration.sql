-- AlterTable
ALTER TABLE "StockCount" ADD COLUMN     "reversedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockCountLine" ADD COLUMN     "addedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;
