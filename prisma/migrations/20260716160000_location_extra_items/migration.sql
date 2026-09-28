-- Non-stock items placed in a bin (Reuse material, empty pallets, equipment…)
ALTER TABLE "Location" ADD COLUMN "extraItems" JSONB;
