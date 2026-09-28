"use client";

import { useEffect, useState, useActionState } from "react";
import { KpiResult } from "@/lib/calc/kpi";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import {
  getKpiLogsAction,
  addKpiLogAction,
  deleteKpiLogAction,
  getQualityBreakdownAction,
  getAccuracyBreakdownAction,
  getRecentIssueDocsAction,
  AddKpiLogState,
} from "@/lib/actions/kpi";
import { fmtDateBE } from "@/lib/calc/date";

// SQDCI letter + accent per KPI. The 5 KPIs literally are the SQDCI board:
// Safety · Quality · Delivery · Cost · Inventory-accuracy.
const SQDCI: Record<KpiResult["key"], { letter: string; hue: string }> = {
  safety: { letter: "S", hue: "#2f86cf" },
  quality: { letter: "Q", hue: "#7b6ef0" },
  delivery: { letter: "D", hue: "#2aa775" },
  cost: { letter: "C", hue: "#e59a2b" },
  accuracy: { letter: "I", hue: "#e5679a" },
};

export function KpiBand({ kpis }: { kpis: KpiResult[] }) {
  const [openKey, setOpenKey] = useState<KpiResult["key"] | null>(null);
  const active = kpis.find((k) => k.key === openKey) ?? null;

  return (
    <div className="mb-4">
      <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-1">
        <div className="flex items-center">
          {(["safety", "quality", "delivery", "cost", "accuracy"] as KpiResult["key"][]).map((key) => (
            <span
              key={key}
              className="text-[34px] font-extrabold leading-none tracking-tight drop-shadow-sm sm:text-[40px]"
              style={{ color: SQDCI[key].hue }}
            >
              {SQDCI[key].letter}
            </span>
          ))}
        </div>
        <span className="pb-1 text-[12px] font-medium text-[#7a889a]">
          Safety · Quality · Delivery · Cost · Inventory
          <span className="ml-1 text-[#a6b0bd]">(แตะการ์ดเพื่อดู/บันทึก)</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const meta = SQDCI[k.key];
          const warn = k.tone !== "ok";
          return (
            <button
              key={k.key}
              onClick={() => setOpenKey(k.key)}
              className="group relative overflow-hidden rounded-[16px] border border-[#e7ebf1] bg-white p-[16px_16px_14px] text-left shadow-[0_1px_2px_rgba(20,30,48,.04),0_8px_22px_rgba(20,30,48,.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,30,48,.10)]"
              style={{ ["--hue" as string]: meta.hue }}
            >
              {/* top accent bar */}
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${meta.hue}, ${meta.hue}55)` }}
              />
              {/* big watermark letter */}
              <span
                className="pointer-events-none absolute -left-2 -top-7 font-num text-[112px] font-black leading-none opacity-[0.14] transition-transform duration-300 group-hover:scale-110"
                style={{ color: meta.hue }}
              >
                {meta.letter}
              </span>
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-[8px] text-[13px] font-bold text-white"
                  style={{ background: meta.hue }}
                >
                  {meta.letter}
                </span>
                <span className="min-w-0 truncate text-[11px] font-medium leading-tight text-[#69748a]">
                  {k.label} ({k.th})
                </span>
              </div>
              <div
                className="font-num text-[26px] font-extrabold tracking-tight"
                style={{ color: warn ? "#c9821f" : "#16202e" }}
              >
                {k.value}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: warn ? "#e59a2b" : meta.hue }}
                />
                <span className="truncate text-[10px] text-[#9aa4b4]">{k.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      {active && active.loggable && (
        <KpiLogModal kpi={active} onClose={() => setOpenKey(null)} />
      )}
      {active && !active.loggable && active.key === "quality" && (
        <QualityModal onClose={() => setOpenKey(null)} />
      )}
      {active && !active.loggable && active.key === "accuracy" && (
        <AccuracyModal onClose={() => setOpenKey(null)} />
      )}
    </div>
  );
}

type Log = {
  id: string;
  date: string;
  detail: string | null;
  amount: number | null;
  incident: boolean | null;
  issueDocNo: string | null;
  onTime: boolean | null;
};

function KpiLogModal({ kpi, onClose }: { kpi: KpiResult; onClose: () => void }) {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [issueDocs, setIssueDocs] = useState<string[]>([]);
  const keyUpper = kpi.key.toUpperCase() as "SAFETY" | "COST" | "DELIVERY";

  useEffect(() => {
    getKpiLogsAction(keyUpper).then(setLogs);
    if (keyUpper === "DELIVERY") getRecentIssueDocsAction().then(setIssueDocs);
  }, [keyUpper]);

  const [, formAction, pending] = useActionState<AddKpiLogState, FormData>(
    async (prev, fd) => {
      const res = await addKpiLogAction(prev, fd);
      if (!res.error) {
        getKpiLogsAction(keyUpper).then(setLogs);
        if (keyUpper === "DELIVERY") getRecentIssueDocsAction().then(setIssueDocs);
      }
      return res;
    },
    {}
  );

  async function del(id: string) {
    await deleteKpiLogAction(id);
    getKpiLogsAction(keyUpper).then(setLogs);
    if (keyUpper === "DELIVERY") getRecentIssueDocsAction().then(setIssueDocs);
  }

  return (
    <Modal open onClose={onClose} width={560}>
      <ModalHeader title={`${kpi.label} (${kpi.th}) — log`} onClose={onClose} />
      <div className="px-5 py-4">
        <div className="mb-3 text-[12px] text-[#69748a]">
          {kpi.target}. Current: <b>{kpi.value}</b> · {kpi.sub}
        </div>
        <form action={formAction} className="mb-4 flex flex-wrap items-end gap-2 rounded-[10px] bg-[#f7f9fb] p-3">
          <input type="hidden" name="key" value={keyUpper} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">Date</span>
            <input type="date" name="date" required className={inputClass} />
          </label>
          {keyUpper === "SAFETY" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#69748a]">ประเภท (Type)</span>
                <select name="incident" defaultValue="true" className={inputClass}>
                  <option value="true">เหตุการณ์ (Incident)</option>
                  <option value="false">ตั้งวันเริ่มนับ (Reset / safe since)</option>
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] text-[#69748a]">รายละเอียด (Detail)</span>
                <input name="detail" placeholder="เช่น เริ่มนับใหม่, อุบัติเหตุ…" className={inputClass} />
              </label>
            </>
          )}
          {keyUpper === "COST" && (
            <>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] text-[#69748a]">Detail</span>
                <input name="detail" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#69748a]">Amount (฿)</span>
                <input name="amount" type="number" required className={`${inputClass} w-[110px]`} />
              </label>
            </>
          )}
          {keyUpper === "DELIVERY" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#69748a]">Issue doc</span>
                <input
                  name="issueDocNo"
                  list="issueDocs"
                  required
                  className={`${inputClass} w-[150px]`}
                />
                <datalist id="issueDocs">
                  {issueDocs.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[#69748a]">On-time?</span>
                <select name="onTime" className={inputClass}>
                  <option value="true">On-time</option>
                  <option value="false">Late</option>
                </select>
              </label>
            </>
          )}
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            + Add
          </button>
        </form>

        <div className="max-h-[260px] overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-[#9aa4b4]">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Detail</th>
                <th className="pb-2 text-right font-medium">Value</th>
                <th className="w-8 pb-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id} className="border-t border-[#eef1f5]">
                  <td className="font-num py-2">{fmtDateBE(new Date(l.date))}</td>
                  <td className="py-2">
                    {keyUpper === "SAFETY" && (
                      <>
                        {l.incident === false && (
                          <span className="mr-1.5 rounded-[5px] bg-[#e4f4f8] px-1.5 py-0.5 text-[10px] font-semibold text-[#1f66a6]">
                            เริ่มนับ
                          </span>
                        )}
                        {l.detail}
                      </>
                    )}
                    {keyUpper === "COST" && l.detail}
                    {keyUpper === "DELIVERY" && `Issue ${l.issueDocNo}`}
                  </td>
                  <td className="font-num py-2 text-right">
                    {keyUpper === "COST" && l.amount != null ? `฿${l.amount.toLocaleString()}` : ""}
                    {keyUpper === "DELIVERY" && (l.onTime ? "On-time" : "Late")}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => del(l.id)}
                      title="ลบรายการนี้ (delete)"
                      className="text-[15px] text-[#c2606f] hover:text-[#a83b36]"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {logs && logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-[#9aa4b4]">
                    No entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function QualityModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getQualityBreakdownAction>> | null>(null);
  useEffect(() => {
    getQualityBreakdownAction().then(setRows);
  }, []);
  return (
    <Modal open onClose={onClose} width={640}>
      <ModalHeader title="Quality (คุณภาพ) — customer returns" onClose={onClose} />
      <div className="max-h-[400px] overflow-auto px-5 py-4">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left text-[#9aa4b4]">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Doc</th>
              <th className="pb-2 font-medium">Customer / Reason</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Restock</th>
              <th className="pb-2 text-right font-medium">Hold</th>
              <th className="pb-2 text-right font-medium">Scrap</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.doc} className="border-t border-[#eef1f5]">
                <td className="font-num py-2">{fmtDateBE(new Date(r.date))}</td>
                <td className="font-num py-2">{r.doc}</td>
                <td className="py-2">
                  {r.customer}
                  <span className="block text-[11px] text-[#9aa4b4]">{r.reason}</span>
                </td>
                <td className="font-num py-2 text-right font-semibold">{r.qty.toLocaleString()}</td>
                <td className="font-num py-2 text-right text-[#1f9d63]">{r.restocked.toLocaleString()}</td>
                <td className="font-num py-2 text-right text-[#b5790f]">{r.held.toLocaleString()}</td>
                <td className="font-num py-2 text-right text-[#c53f3f]">{r.scrapped.toLocaleString()}</td>
              </tr>
            ))}
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#9aa4b4]">
                  ยังไม่มีการรับคืน (no returns yet)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function AccuracyModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<
    { date: string; doc: string; counted: number; matched: number; pct: number }[] | null
  >(null);
  useEffect(() => {
    getAccuracyBreakdownAction().then(setRows);
  }, []);
  return (
    <Modal open onClose={onClose} width={560}>
      <ModalHeader title="Inventory Accuracy (ความแม่นยำสต็อก) — count cycles" onClose={onClose} />
      <div className="max-h-[400px] overflow-auto px-5 py-4">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left text-[#9aa4b4]">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Doc</th>
              <th className="pb-2 text-right font-medium">Counted</th>
              <th className="pb-2 text-right font-medium">Matched</th>
              <th className="pb-2 text-right font-medium">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.doc} className="border-t border-[#eef1f5]">
                <td className="font-num py-2">{fmtDateBE(new Date(r.date))}</td>
                <td className="font-num py-2">{r.doc}</td>
                <td className="font-num py-2 text-right">{r.counted.toLocaleString()}</td>
                <td className="font-num py-2 text-right">{r.matched.toLocaleString()}</td>
                <td className="font-num py-2 text-right font-semibold">{r.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

const inputClass =
  "rounded-[7px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#2f86cf]";
