"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { getReportRowsAction } from "@/lib/actions/reports";
import { REPORT_TYPES, ReportType, ReportRows } from "@/lib/reportTypes";

export function ReportRunner({ start, end }: { start: string; end: string }) {
  const [type, setType] = useState<ReportType>("receiving");
  const [data, setData] = useState<ReportRows | null>(null);
  // The report type that the currently-shown data belongs to (so Export always
  // matches what's on screen, even if the dropdown was changed afterwards).
  const [shownType, setShownType] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await getReportRowsAction({ type, start, end });
    setData(res);
    setShownType(type);
    setLoading(false);
  }

  const label = REPORT_TYPES.find((r) => r.value === (shownType ?? type))?.label ?? "";
  const exportHref = `/api/export/reports?type=${shownType}&start=${start}&end=${end}`;

  return (
    <Card className="mb-4">
      <CardTitle>Reports (รายงาน) — เลือกรายงาน → กดแสดงข้อมูล → Export</CardTitle>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ReportType)}
          className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
        >
          {REPORT_TYPES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="font-num text-[12px] text-[#69748a]">
          {start} → {end}
        </span>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-[8px] bg-[#2f86cf] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1f66a6] disabled:opacity-60"
        >
          {loading ? "กำลังโหลด…" : "▶ แสดงข้อมูล (Execute)"}
        </button>
        <div className="flex-1" />
        {data && shownType && (
          <a
            href={exportHref}
            className="flex items-center gap-1.5 rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3.5 py-2 text-[12.5px] font-semibold text-[#0c7f93]"
          >
            ⤓ Export Excel
          </a>
        )}
      </div>

      {data && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between text-[12px] text-[#69748a]">
            <span className="font-semibold text-[#3a4658]">{label}</span>
            <span className="font-num">{data.rows.length.toLocaleString()} แถว (rows)</span>
          </div>
          <div className="max-h-[460px] overflow-auto rounded-[10px] border border-[#eef1f5]">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="sticky top-0 bg-[#f7f9fb] text-left text-[#69748a]">
                  {data.cols.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} className="border-t border-[#eef1f5]">
                    {r.map((v, j) => (
                      <td
                        key={j}
                        className={`whitespace-nowrap px-3 py-2 ${
                          j === 0 ? "font-num font-semibold text-[#3a4658]" : j === r.length - 1 ? "font-num text-[11px] text-[#9aa4b4]" : ""
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={data.cols.length} className="py-6 text-center text-[#9aa4b4]">
                      ไม่มีข้อมูลในช่วงนี้ (No data for this period)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
