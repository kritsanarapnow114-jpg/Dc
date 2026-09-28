-- Outbound Ship Orders (sales orders): what a customer ordered and where it
-- ships. Stock is NOT moved here — it moves only when a shipment is confirmed,
-- which creates an EXTERNAL goods Issue linked back to the order via
-- "Issue"."shipOrderId". Written idempotently so a cold-start re-apply is a
-- harmless no-op.

DO $$ BEGIN
  CREATE TYPE "ShipOrderStatus" AS ENUM ('OPEN', 'PENDING', 'COMPLETE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ShipOrder" (
  "id" TEXT NOT NULL,
  "no" TEXT NOT NULL,
  "status" "ShipOrderStatus" NOT NULL DEFAULT 'OPEN',
  "customerId" TEXT NOT NULL,
  "shipToId" TEXT,
  "shipToName" TEXT,
  "shipToAddress" TEXT,
  "orderDate" TIMESTAMP(3) NOT NULL,
  "requestedShipDate" TIMESTAMP(3),
  "tracking" TEXT,
  "remark" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShipOrder_no_key" ON "ShipOrder"("no");
CREATE INDEX IF NOT EXISTS "ShipOrder_status_idx" ON "ShipOrder"("status");
CREATE INDEX IF NOT EXISTS "ShipOrder_customerId_idx" ON "ShipOrder"("customerId");

CREATE TABLE IF NOT EXISTS "ShipOrderLine" (
  "id" TEXT NOT NULL,
  "soId" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "ordered" DOUBLE PRECISION NOT NULL,
  "shipped" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "ShipOrderLine_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "shipOrderId" TEXT;
CREATE INDEX IF NOT EXISTS "Issue_shipOrderId_idx" ON "Issue"("shipOrderId");

-- Foreign keys (guarded so a re-apply doesn't error on an existing constraint).
DO $$ BEGIN
  ALTER TABLE "ShipOrder" ADD CONSTRAINT "ShipOrder_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ShipOrder" ADD CONSTRAINT "ShipOrder_shipToId_fkey"
    FOREIGN KEY ("shipToId") REFERENCES "ShipToAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ShipOrderLine" ADD CONSTRAINT "ShipOrderLine_soId_fkey"
    FOREIGN KEY ("soId") REFERENCES "ShipOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ShipOrderLine" ADD CONSTRAINT "ShipOrderLine_productCode_fkey"
    FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Issue" ADD CONSTRAINT "Issue_shipOrderId_fkey"
    FOREIGN KEY ("shipOrderId") REFERENCES "ShipOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
