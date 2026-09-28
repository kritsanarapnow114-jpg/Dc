-- AlterTable: planned unloading time per SILO session, for OEE Availability.
-- Idempotent (IF NOT EXISTS) so it re-applies cleanly after a Neon cold-start
-- interrupted the first attempt and left it marked failed (see scripts/db-migrate.mjs).
ALTER TABLE "SiloStaging" ADD COLUMN IF NOT EXISTS "plannedMin" DOUBLE PRECISION;
