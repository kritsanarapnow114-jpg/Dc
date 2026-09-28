-- AlterTable: per-line Stock/Non-Stock
ALTER TABLE "ReceiptLine" ADD COLUMN "stockType" "StockType" NOT NULL DEFAULT 'STOCK';
ALTER TABLE "ReceiptLine" ADD COLUMN "stockConvertedAt" TIMESTAMP(3);
ALTER TABLE "IssueLine" ADD COLUMN "stockType" "StockType" NOT NULL DEFAULT 'STOCK';
ALTER TABLE "IssueLine" ADD COLUMN "stockConvertedAt" TIMESTAMP(3);
