-- Soft-delete for bins that hold no stock but still have lot history
ALTER TABLE "Location" ADD COLUMN "archivedAt" TIMESTAMP(3);
