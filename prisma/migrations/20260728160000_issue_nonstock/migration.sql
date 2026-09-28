-- IssueLine can issue from a Non-Stock holding instead of a Lot
ALTER TABLE "IssueLine" ALTER COLUMN "selectedLotId" DROP NOT NULL;
ALTER TABLE "IssueLine" ADD COLUMN "nonStockHoldingId" TEXT;
ALTER TABLE "IssueLine" ADD CONSTRAINT "IssueLine_nonStockHoldingId_fkey" FOREIGN KEY ("nonStockHoldingId") REFERENCES "NonStockHolding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
