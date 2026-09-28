"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PeriodMode = "all" | "date" | "range";

const MODE_LABEL: Record<PeriodMode, string> = {
  all: "View all (ทั้งหมด)",
  date: "Specific date (เฉพาะวันที่)",
  range: "Date range (ช่วงข้อมูล)",
};

/** Shared Period control for Dashboard/Reports — all-time, a single day, or a start→end range. */
export function PeriodSelector({
  basePath,
  mode: initialMode,
  date,
  start,
  end,
}: {
  basePath: string;
  mode: PeriodMode;
  date: string;
  start: string;
  end: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<PeriodMode>(initialMode);
  const [d, setD] = useState(date);
  const [s, setS] = useState(start);
  const [e, setE] = useState(end);

  function go(newMode: PeriodMode, params: Record<string, string>) {
    const qs = new URLSearchParams({ mode: newMode, ...params });
    router.push(`${basePath}?${qs.toString()}`);
  }

  function selectMode(m: PeriodMode) {
    setMode(m);
    if (m === "all") go("all", {});
    else if (m === "date") go("date", { date: d });
    else go("range", { start: s, end: e });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[14px] border border-[#e7ebf1] bg-white p-3.5 shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
      <span className="text-[13px] font-semibold">Period (ช่วงข้อมูล)</span>

      <div className="flex gap-1 rounded-[9px] bg-[#eef1f5] p-1">
        {(Object.keys(MODE_LABEL) as PeriodMode[]).map((m) => (
          <button
            key={m}
            onClick={() => selectMode(m)}
            className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium ${
              mode === m ? "bg-white text-[#16202e] shadow-sm" : "text-[#69748a]"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {mode === "date" && (
        <input
          type="date"
          value={d}
          onChange={(ev) => {
            setD(ev.target.value);
            go("date", { date: ev.target.value });
          }}
          className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px]"
        />
      )}

      {mode === "range" && (
        <>
          <input
            type="date"
            value={s}
            onChange={(ev) => {
              setS(ev.target.value);
              go("range", { start: ev.target.value, end: e });
            }}
            className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px]"
          />
          <span className="text-[#9aa4b4]">→</span>
          <input
            type="date"
            value={e}
            onChange={(ev) => {
              setE(ev.target.value);
              go("range", { start: s, end: ev.target.value });
            }}
            className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px]"
          />
        </>
      )}

      <div className="flex-1" />
      <span className="font-num text-[12px] text-[#69748a]">
        {mode === "all" ? "All time (ทั้งหมด)" : mode === "date" ? d : `${s} → ${e}`}
      </span>
    </div>
  );
}
