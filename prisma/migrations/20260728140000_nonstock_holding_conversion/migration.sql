-- Non-Stock holding + Conversion event
CREATE TABLE "NonStockHolding" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "recvDate" TIMESTAMP(3) NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expDate" TIMESTAMP(3),
    "receiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NonStockHolding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversion_docNo_key" ON "Conversion"("docNo");
CREATE INDEX "NonStockHolding_productCode_idx" ON "NonStockHolding"("productCode");
CREATE INDEX "Conversion_productCode_idx" ON "Conversion"("productCode");
CREATE INDEX "Conversion_docDate_idx" ON "Conversion"("docDate");

ALTER TABLE "NonStockHolding" ADD CONSTRAINT "NonStockHolding_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
