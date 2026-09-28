-- Split outbound issues into INTERNAL (used in-house) vs EXTERNAL (sold to a
-- customer). Written idempotently so a cold-start re-apply is a harmless no-op.

DO $$ BEGIN
  CREATE TYPE "IssueType" AS ENUM ('INTERNAL', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "issueType" "IssueType" NOT NULL DEFAULT 'INTERNAL';
