// Runs `prisma migrate deploy` with retries.
//
// On serverless Postgres (Neon), the compute auto-suspends when idle. The first
// connection from a cold Vercel build wakes it, but Prisma's migration advisory
// lock times out after ~10s (error P1002), which fails the whole build. Retrying
// gives the database time to wake and the previous lock time to release.
//
// A cold-start can also interrupt a migration mid-apply, leaving it marked
// "failed" in the database. Prisma then refuses to apply ANY further migrations
// (error P3009) until that record is cleared. Before each deploy we therefore
// mark any known-stuck migration as rolled-back — its columns are additive and
// re-applied idempotently (ADD COLUMN IF NOT EXISTS). The resolve is a harmless
// no-op once the migration is no longer in a failed state.
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Migrations a Neon cold-start left failed that are safe to re-apply (idempotent
// SQL). Cleared before each deploy attempt.
const RECOVERABLE_FAILED = [
  "20260801130000_oee_production",
  "20260802120000_oee_quality",
  "20260803120000_silo_planned_min",
];

function clearFailedMigrations() {
  for (const name of RECOVERABLE_FAILED) {
    // Ignore the exit code: this errors (harmlessly) when the migration isn't in
    // a failed state, e.g. after it has already been re-applied successfully.
    spawnSync("npx", ["--no-install", "prisma", "migrate", "resolve", "--rolled-back", name], {
      stdio: "inherit",
      shell: true,
    });
  }
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    clearFailedMigrations();

    const res = spawnSync("npx", ["--no-install", "prisma", "migrate", "deploy"], {
      stdio: "inherit",
      shell: true,
    });

    if (res.status === 0) {
      if (attempt > 1) console.log(`✓ migrate deploy succeeded on attempt ${attempt}`);
      process.exit(0);
    }

    if (attempt === MAX_ATTEMPTS) {
      console.error(`✗ migrate deploy failed after ${MAX_ATTEMPTS} attempts`);
      process.exit(res.status ?? 1);
    }

    const waitSec = attempt * 8; // 8s, 16s, 24s, 32s, 40s
    console.warn(
      `migrate deploy attempt ${attempt}/${MAX_ATTEMPTS} failed (likely a cold/locked database) — retrying in ${waitSec}s…`
    );
    await sleep(waitSec * 1000);
  }
}

main();
