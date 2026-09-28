import "server-only";
import { db } from "@/lib/db";

// Re-export the client-safe keys/helpers so server code can import everything
// from one place.
export {
  subtitleKey,
  COUNT_PLAN_MONTHLY_KEY,
  COUNT_PLAN_WEEKLY_KEY,
  COUNT_PLAN_MONTHS_KEY,
  COUNT_PLAN_WEEKS_KEY,
  getCountPlan,
  getCountPlanDetailed,
} from "@/lib/settingsKeys";

/** Read all app settings as a plain key→value map. */
export async function getAppSettings(): Promise<Record<string, string>> {
  const rows = await db.appSetting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}
