-- DC copy: remove the production-plant modules (Pack Order / OEE / BOM /
-- Packaging Plan / Feed-to-SILO / Non-Stock) and add Customer Returns.
--
-- Written idempotently (IF EXISTS / IF NOT EXISTS) like the earlier migrations
-- so a cold-start re-apply is harmless.
--
-- SAFETY: this migration is meant for a fresh DC database. The guard below
-- stops it BEFORE anything is dropped if the database still holds production
-- data (production receipts, BOMs, SILO or Non-Stock records). Do not force it
-- onto the old plant database without exporting that data first.

DO $$
DECLARE n bigint := 0; c bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'ReceiptMode' AND e.enumlabel = 'PRODUCTION') THEN
    EXECUTE 'SELECT count(*) FROM "Receipt" WHERE "mode"::text = ''PRODUCTION''' INTO c; n := n + c;
  END IF;
  IF to_regclass('"Bom"') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM "Bom"' INTO c; n := n + c; END IF;
  IF to_regclass('"SiloStaging"') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM "SiloStaging"' INTO c; n := n + c; END IF;
  IF to_regclass('"NonStockHolding"') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM "NonStockHolding"' INTO c; n := n + c; END IF;
  IF n > 0 THEN
    RAISE EXCEPTION 'DC migration aborted: % production/BOM/SILO/Non-Stock rows still exist. Run it on a fresh DC database, or export and clear that data first.', n;
  END IF;
END $$;

-- ---------------------------------------------------------------- SILO
DROP TABLE IF EXISTS "SiloLoad";
DROP TABLE IF EXISTS "SiloStaging";

-- ---------------------------------------------------------------- Non-Stock
ALTER TABLE "IssueLine" DROP CONSTRAINT IF EXISTS "IssueLine_nonStockHoldingId_fkey";
ALTER TABLE "IssueLine" DROP COLUMN IF EXISTS "nonStockHoldingId";
ALTER TABLE "IssueLine" DROP COLUMN IF EXISTS "stockType";
ALTER TABLE "IssueLine" DROP COLUMN IF EXISTS "stockConvertedAt";
ALTER TABLE "Issue" DROP COLUMN IF EXISTS "stockType";
DROP TABLE IF EXISTS "Conversion";
DROP TABLE IF EXISTS "NonStockHolding";

-- ---------------------------------------------------------------- BOM / production receipts
DROP TABLE IF EXISTS "ReceiptMaterialConsumption";
DROP TABLE IF EXISTS "ReceiptBomLoss";
DROP TABLE IF EXISTS "BomLine";
DROP TABLE IF EXISTS "Bom";

ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "stockType";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "producedTotal";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "prodLoss";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "verifiedAt";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "oeeLine";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "shift";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "plannedMin";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "breakMin";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "downtime";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "oeeQuality";

ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "suNo";
ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "weightKg";
ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "palletFull";
ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "packTime";
ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "stockType";
ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "stockConvertedAt";
ALTER TABLE "ReceiptLine" DROP COLUMN IF EXISTS "movedToNonStockAt";

DROP TYPE IF EXISTS "StockType";

-- ReceiptMode: PO only (PRODUCTION removed). Recreate the enum and cast.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ReceiptMode' AND e.enumlabel = 'PRODUCTION'
  ) THEN
    ALTER TYPE "ReceiptMode" RENAME TO "ReceiptMode_old";
    CREATE TYPE "ReceiptMode" AS ENUM ('PO');
    ALTER TABLE "Receipt" ALTER COLUMN "mode" TYPE "ReceiptMode" USING ("mode"::text::"ReceiptMode");
    DROP TYPE "ReceiptMode_old";
  END IF;
END $$;

-- ---------------------------------------------------------------- Customer returns
DO $$ BEGIN
  CREATE TYPE "ReturnDisposition" AS ENUM ('RESTOCK', 'HOLD', 'SCRAP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "CustomerReturn" (
  "id" TEXT NOT NULL,
  "docNo" TEXT NOT NULL,
  "customerId" TEXT,
  "issueId" TEXT,
  "reason" TEXT NOT NULL,
  "remark" TEXT,
  "docDate" TIMESTAMP(3) NOT NULL,
  "reversedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerReturn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerReturn_docNo_key" ON "CustomerReturn"("docNo");
CREATE INDEX IF NOT EXISTS "CustomerReturn_docDate_idx" ON "CustomerReturn"("docDate");
CREATE INDEX IF NOT EXISTS "CustomerReturn_customerId_idx" ON "CustomerReturn"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerReturn_issueId_idx" ON "CustomerReturn"("issueId");

CREATE TABLE IF NOT EXISTS "CustomerReturnLine" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "lotNo" TEXT NOT NULL,
  "locationCode" TEXT,
  "qty" DOUBLE PRECISION NOT NULL,
  "mfgDate" TIMESTAMP(3),
  "expDate" TIMESTAMP(3),
  "disposition" "ReturnDisposition" NOT NULL,
  "lotId" TEXT,
  CONSTRAINT "CustomerReturnLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomerReturnLine_productCode_idx" ON "CustomerReturnLine"("productCode");

DO $$ BEGIN
  ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerReturnLine" ADD CONSTRAINT "CustomerReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "CustomerReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerReturnLine" ADD CONSTRAINT "CustomerReturnLine_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CustomerReturnLine" ADD CONSTRAINT "CustomerReturnLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
