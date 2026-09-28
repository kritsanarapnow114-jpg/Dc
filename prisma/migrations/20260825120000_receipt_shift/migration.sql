-- Production shift (กะ) captured on a Pack Order run. Feeds the "OEE by shift"
-- breakdown on the dashboard and report. Written idempotently so a cold-start
-- re-apply is a harmless no-op.

ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "shift" TEXT;
