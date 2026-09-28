"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { saveAppSettingsAction } from "@/lib/actions/settings";
import { COUNT_PLAN_MONTHS_KEY, COUNT_PLAN_WEEKS_KEY, MONTH_NAMES } from "@/lib/settingsKeys";
import { showToast } from "@/components/ui/Toast";

export function CountPlanCard({
  months: monthsInit,
  weeks: weeksInit,
}: {
  months: string[]; // length 12, index 0 = Jan
  weeks: string[]; // length 5, index 0 = W1
}) {
  const router = useRouter();
  const [months, setMonths] = useState<string[]>(monthsInit);
  const [weeks, setWeeks] = useState<string[]>(weeksInit);
  const [busy, setBusy] = useState(false);

  function toJson(arr: string[]): string {
    // empty string -> null so that month reverts to "count every lot"
    return JSON.stringify(arr.map((v) => (v.trim() === "" ? null : Number(v))));
  }

  async function handleSave() {
    setBusy(true);
    await saveAppSettingsAction({
      [COUNT_PLAN_MONTHS_KEY]: toJson(months),
      [COUNT_PLAN_WEEKS_KEY]: toJson(weeks),
    });
    setBusy(false);
    showToast("Count plan saved");
    router.refresh();
  }

  const numClass =
    "w-full rounded-[8px] border border-[#d7dce4] px-2 py-1.5 text-center text-[13px] outline-none focus:border-[#2f86cf]";

  return (
    <Card>
      <CardTitle>Stock Count Plan (แผนนับสต็อก)</CardTitle>
      <p className="mb-3 text-[12.5px] text-[#69748a]">
        ตั้งเป้าจำนวน lot ที่ต้องนับ <b>แยกรายเดือน</b> และ <b>รายสัปดาห์</b> — ใช้เป็นตัวตั้ง (แผน) ในกราฟ
        Count Progress บนแดชบอร์ด · เว้นว่าง = นับทุก lot (blank = plan every lot).
      </p>

      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
        Per month (รายเดือน) — lots
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MONTH_NAMES.map((m, i) => (
          <label key={m} className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">{m}</span>
            <input
              value={months[i] ?? ""}
              onChange={(e) => setMonths((ms) => ms.map((v, idx) => (idx === i ? e.target.value : v)))}
              type="number"
              min="0"
              className={numClass}
            />
          </label>
        ))}
      </div>

      <div className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
        Per week of month (รายสัปดาห์) — lots
      </div>
      <div className="grid grid-cols-5 gap-2">
        {weeks.map((w, i) => (
          <label key={i} className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">W{i + 1}</span>
            <input
              value={w}
              onChange={(e) => setWeeks((ws) => ws.map((v, idx) => (idx === i ? e.target.value : v)))}
              type="number"
              min="0"
              className={numClass}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button onClick={handleSave} disabled={busy} className={buttonClass("primary")}>
          {busy ? "Saving…" : "Save plan"}
        </button>
      </div>
    </Card>
  );
}
