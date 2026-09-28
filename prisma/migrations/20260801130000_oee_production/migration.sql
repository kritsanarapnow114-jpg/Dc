-- AlterTable: OEE capture for production receipts (columns only, no new table).
-- Idempotent (IF NOT EXISTS) so it re-applies cleanly after a Neon cold-start
-- interrupted the first attempt and left it marked failed (see scripts/db-migrate.mjs).
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "oeeLine" TEXT;
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "plannedMin" INTEGER;
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "breakMin" INTEGER;
ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "downtime" JSONB;
