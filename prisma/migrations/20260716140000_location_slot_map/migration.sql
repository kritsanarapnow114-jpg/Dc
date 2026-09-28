-- Custom pallet arrangement inside each bin (drag pallets to real positions)
ALTER TABLE "Location" ADD COLUMN "slotMap" JSONB;
