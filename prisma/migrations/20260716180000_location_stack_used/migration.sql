-- Actual pallet-stack height used in a bin (may be lower than the product's max)
ALTER TABLE "Location" ADD COLUMN "stackUsed" INTEGER;
