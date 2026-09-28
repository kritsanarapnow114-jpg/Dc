import { getUsers } from "@/lib/views/users";
import { db } from "@/lib/db";
import {
  getAppSettings,
  getCountPlanDetailed,
} from "@/lib/views/settings";
import { ResetDataCard } from "./ResetDataCard";
import { ClearDemoDataCard } from "./ClearDemoDataCard";
import { ClearTransactionsCard } from "./ClearTransactionsCard";
import { UsersCard } from "./UsersCard";
import { CountPlanCard } from "./CountPlanCard";
import { SubtitlesCard } from "./SubtitlesCard";
import { ListSettingsCard } from "./ListSettingsCard";
import { ISSUE_TO_KEY, OPERATORS_KEY, RETURN_REASONS_KEY } from "@/lib/settingsKeys";

export default async function SettingsPage() {
  const [users, settings, totalLots] = await Promise.all([
    getUsers(),
    getAppSettings(),
    db.lot.count(),
  ]);

  const subtitleOverrides: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (k.startsWith("subtitle.")) subtitleOverrides[k.slice("subtitle.".length)] = v;
  }

  // Prefill each box with the effective plan the dashboard uses: the month/week's
  // own target, else the legacy single value, else "count every lot" (totalLots).
  // This way no box is ever blank — the numbers match what's shown on the chart.
  const plan = getCountPlanDetailed(settings);
  const effective = (own: number | null, fallback: number | null) =>
    String(own ?? fallback ?? totalLots);
  const monthsInit = Array.from({ length: 12 }, (_, i) =>
    effective(plan.months[i], plan.monthlyFallback)
  );
  const weeksInit = Array.from({ length: 5 }, (_, i) =>
    effective(plan.weeks[i], plan.weeklyFallback)
  );

  return (
    <div className="max-w-[720px] p-[22px_26px]">
      <UsersCard users={users} />
      <div className="mt-4">
        <CountPlanCard months={monthsInit} weeks={weeksInit} />
      </div>
      <div className="mt-4">
        <ListSettingsCard
          issueTo={settings[ISSUE_TO_KEY] ?? ""}
          operators={settings[OPERATORS_KEY] ?? ""}
          returnReasons={settings[RETURN_REASONS_KEY] ?? ""}
        />
      </div>
      <div className="mt-4">
        <SubtitlesCard overrides={subtitleOverrides} />
      </div>
      <div className="mt-4">
        <ClearDemoDataCard />
      </div>
      <div className="mt-4">
        <ClearTransactionsCard />
      </div>
      <div className="mt-4">
        <ResetDataCard />
      </div>
    </div>
  );
}
