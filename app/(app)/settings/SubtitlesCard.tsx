"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { PAGE_TITLES } from "@/components/layout/nav";
import { saveAppSettingsAction } from "@/lib/actions/settings";
import { subtitleKey } from "@/lib/settingsKeys";
import { showToast } from "@/components/ui/Toast";

// Editable pages in nav order (path without slash).
const PAGES = [
  "dashboard",
  "products",
  "aging",
  "locations",
  "receive",
  "po",
  "issue",
  "adjust",
  "transfer",
  "count",
  "reports",
];

export function SubtitlesCard({ overrides }: { overrides: Record<string, string> }) {
  const router = useRouter();
  const defaults: Record<string, string> = {};
  for (const p of PAGES) defaults[p] = PAGE_TITLES[`/${p}`]?.sub ?? "";

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const p of PAGES) v[p] = overrides[p] ?? defaults[p];
    return v;
  });
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    const entries: Record<string, string> = {};
    for (const p of PAGES) {
      const val = values[p].trim();
      // Store an override only when it differs from the built-in default;
      // otherwise send "" so the action clears it back to default.
      entries[subtitleKey(p)] = val === defaults[p].trim() ? "" : val;
    }
    await saveAppSettingsAction(entries);
    setBusy(false);
    showToast("Subtitles saved");
    router.refresh();
  }

  function reset(p: string) {
    setValues((v) => ({ ...v, [p]: defaults[p] }));
  }

  return (
    <Card>
      <CardTitle>Page Subtitles (คำอธิบายใต้ชื่อหน้า)</CardTitle>
      <p className="mb-3 text-[12.5px] text-[#69748a]">
        แก้ข้อความบรรทัดเล็กที่อยู่ใต้ชื่อแต่ละหน้า (บนหัวเว็บ) — Edit the small line under each page title.
      </p>
      <div className="flex flex-col gap-2.5">
        {PAGES.map((p) => (
          <label key={p} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-[110px] flex-none text-[11.5px] font-medium capitalize text-[#3a4658]">
              {PAGE_TITLES[`/${p}`]?.title ?? p}
            </span>
            <input
              value={values[p]}
              onChange={(e) => setValues((v) => ({ ...v, [p]: e.target.value }))}
              className="min-w-0 flex-1 rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#2f86cf]"
            />
            <button
              type="button"
              onClick={() => reset(p)}
              className="flex-none text-[11px] text-[#9aa4b4] hover:text-[#3a4658]"
            >
              reset
            </button>
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={handleSave} disabled={busy} className={buttonClass("primary")}>
          {busy ? "Saving…" : "Save subtitles"}
        </button>
      </div>
    </Card>
  );
}
