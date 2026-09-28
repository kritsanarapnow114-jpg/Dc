CREATE TABLE "SiloStaging" (
  "id" TEXT NOT NULL,
  "docNo" TEXT NOT NULL,
  "productCode" TEXT NOT NULL,
  "lotNo" TEXT NOT NULL,
  "sourceLoc" TEXT NOT NULL,
  "qtyStaged" DOUBLE PRECISION NOT NULL,
  "qtyLoaded" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stagedBy" TEXT,
  "stagedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiloStaging_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiloStaging_docNo_key" ON "SiloStaging"("docNo");
CREATE INDEX "SiloStaging_productCode_idx" ON "SiloStaging"("productCode");
CREATE INDEX "SiloStaging_stagedAt_idx" ON "SiloStaging"("stagedAt");
ALTER TABLE "SiloStaging" ADD CONSTRAINT "SiloStaging_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SiloLoad" (
  "id" TEXT NOT NULL,
  "stagingId" TEXT NOT NULL,
  "qty" DOUBLE PRECISION NOT NULL,
  "machine" TEXT,
  "silo" TEXT,
  "operator" TEXT,
  "loadedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiloLoad_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiloLoad_stagingId_idx" ON "SiloLoad"("stagingId");
ALTER TABLE "SiloLoad" ADD CONSTRAINT "SiloLoad_stagingId_fkey" FOREIGN KEY ("stagingId") REFERENCES "SiloStaging"("id") ON DELETE CASCADE ON UPDATE CASCADE;
