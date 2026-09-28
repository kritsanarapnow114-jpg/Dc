-- Production receipts wait for warehouse verification before finished goods enter stock.
ALTER TABLE "Receipt" ADD COLUMN "verifiedAt" TIMESTAMP(3);
-- Backfill: every existing receipt is already in stock, so treat it as verified.
UPDATE "Receipt" SET "verifiedAt" = "createdAt" WHERE "verifiedAt" IS NULL;

-- Per-line SU running number and recorded weight (kg).
ALTER TABLE "ReceiptLine" ADD COLUMN "suNo" INTEGER;
ALTER TABLE "ReceiptLine" ADD COLUMN "weightKg" DOUBLE PRECISION;
