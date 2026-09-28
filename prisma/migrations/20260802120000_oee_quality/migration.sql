-- AlterTable: capture Quality-loss breakdown + repack/scrap on production
-- receipts (single JSON column). Idempotent so a Neon cold-start retry is safe.
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "oeeQuality" JSONB;
