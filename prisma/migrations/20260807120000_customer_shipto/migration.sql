-- Customers + their Ship-to addresses, and the link from an Issue (sales
-- outbound) to a customer / ship-to address (with snapshot columns). Written
-- idempotently (IF NOT EXISTS) so a cold-start re-apply is a harmless no-op.

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "taxId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_code_key" ON "Customer"("code");
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");

CREATE TABLE IF NOT EXISTS "ShipToAddress" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipToAddress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ShipToAddress_customerId_idx" ON "ShipToAddress"("customerId");

ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "shipToId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "shipToName" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "shipToAddress" TEXT;
CREATE INDEX IF NOT EXISTS "Issue_customerId_idx" ON "Issue"("customerId");

-- Foreign keys (guarded so a re-apply doesn't error on an existing constraint).
DO $$ BEGIN
  ALTER TABLE "ShipToAddress" ADD CONSTRAINT "ShipToAddress_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Issue" ADD CONSTRAINT "Issue_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Issue" ADD CONSTRAINT "Issue_shipToId_fkey"
    FOREIGN KEY ("shipToId") REFERENCES "ShipToAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
