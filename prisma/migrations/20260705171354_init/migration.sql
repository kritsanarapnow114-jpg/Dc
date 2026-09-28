-- CreateEnum
CREATE TYPE "Category" AS ENUM ('RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOODS', 'SPARE_PARTS');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('OK', 'QC');

-- CreateEnum
CREATE TYPE "ReceiptMode" AS ENUM ('PO', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('OPEN', 'PENDING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "AdjustReason" AS ENUM ('COUNT_VARIANCE', 'DAMAGED', 'EXPIRED', 'QC_REJECT');

-- CreateEnum
CREATE TYPE "KpiKey" AS ENUM ('SAFETY', 'COST', 'DELIVERY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Warehouse Lead',
    "avatarInitials" TEXT NOT NULL DEFAULT 'U',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "pallet" INTEGER NOT NULL DEFAULT 500,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "stackLevels" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Location" (
    "code" TEXT NOT NULL,
    "zone" "Zone" NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'OK',
    "recvDate" TIMESTAMP(3) NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "ordered" DOUBLE PRECISION NOT NULL,
    "received" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "mode" "ReceiptMode" NOT NULL,
    "poId" TEXT,
    "invoiceNo" TEXT,
    "docDate" TIMESTAMP(3) NOT NULL,
    "producedTotal" DOUBLE PRECISION,
    "prodLoss" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "orderedQty" DOUBLE PRECISION,
    "recvQty" DOUBLE PRECISION NOT NULL,
    "lotNo" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expDate" TIMESTAMP(3),
    "lotId" TEXT,

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bom" (
    "id" TEXT NOT NULL,
    "finishedProductCode" TEXT NOT NULL,

    CONSTRAINT "Bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomLine" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "materialProductCode" TEXT NOT NULL,
    "qtyPerUnit" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "BomLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptBomLoss" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "bomLineId" TEXT NOT NULL,
    "lossQty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ReceiptBomLoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "issueTo" TEXT NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL,
    "shippedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueLine" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "fefoLotId" TEXT,
    "selectedLotId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "IssueLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "reason" "AdjustReason" NOT NULL DEFAULT 'COUNT_VARIANCE',
    "docDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjustmentLine" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "sysQty" DOUBLE PRECISION NOT NULL,
    "countedQty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AdjustmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "fromLocationCode" TEXT NOT NULL,
    "toLocationCode" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "pullZone" TEXT NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountLine" (
    "id" TEXT NOT NULL,
    "stockCountId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "sysQty" DOUBLE PRECISION NOT NULL,
    "countedQty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocSequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "beYear" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiLog" (
    "id" TEXT NOT NULL,
    "key" "KpiKey" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "detail" TEXT,
    "amount" DOUBLE PRECISION,
    "incident" BOOLEAN,
    "issueDocNo" TEXT,
    "onTime" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Location_zone_idx" ON "Location"("zone");

-- CreateIndex
CREATE INDEX "Lot_productCode_idx" ON "Lot"("productCode");

-- CreateIndex
CREATE INDEX "Lot_locationCode_idx" ON "Lot"("locationCode");

-- CreateIndex
CREATE INDEX "Lot_status_idx" ON "Lot"("status");

-- CreateIndex
CREATE INDEX "Lot_expDate_idx" ON "Lot"("expDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_no_key" ON "PurchaseOrder"("no");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_docNo_key" ON "Receipt"("docNo");

-- CreateIndex
CREATE INDEX "Receipt_mode_idx" ON "Receipt"("mode");

-- CreateIndex
CREATE INDEX "Receipt_docDate_idx" ON "Receipt"("docDate");

-- CreateIndex
CREATE UNIQUE INDEX "Bom_finishedProductCode_key" ON "Bom"("finishedProductCode");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_docNo_key" ON "Issue"("docNo");

-- CreateIndex
CREATE INDEX "Issue_docDate_idx" ON "Issue"("docDate");

-- CreateIndex
CREATE UNIQUE INDEX "Adjustment_docNo_key" ON "Adjustment"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_docNo_key" ON "Transfer"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "StockCount_docNo_key" ON "StockCount"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "DocSequence_prefix_beYear_key" ON "DocSequence"("prefix", "beYear");

-- CreateIndex
CREATE INDEX "KpiLog_key_idx" ON "KpiLog"("key");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_locationCode_fkey" FOREIGN KEY ("locationCode") REFERENCES "Location"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bom" ADD CONSTRAINT "Bom_finishedProductCode_fkey" FOREIGN KEY ("finishedProductCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "Bom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_materialProductCode_fkey" FOREIGN KEY ("materialProductCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptBomLoss" ADD CONSTRAINT "ReceiptBomLoss_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptBomLoss" ADD CONSTRAINT "ReceiptBomLoss_bomLineId_fkey" FOREIGN KEY ("bomLineId") REFERENCES "BomLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLine" ADD CONSTRAINT "IssueLine_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLine" ADD CONSTRAINT "IssueLine_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "Product"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLine" ADD CONSTRAINT "IssueLine_fefoLotId_fkey" FOREIGN KEY ("fefoLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLine" ADD CONSTRAINT "IssueLine_selectedLotId_fkey" FOREIGN KEY ("selectedLotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentLine" ADD CONSTRAINT "AdjustmentLine_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "Adjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjustmentLine" ADD CONSTRAINT "AdjustmentLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferLine" ADD CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferLine" ADD CONSTRAINT "TransferLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
