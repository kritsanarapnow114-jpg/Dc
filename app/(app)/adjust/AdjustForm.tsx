"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LotOption } from "@/lib/views/docCommon";
import { confirmAdjustAction } from "@/lib/actions/adjust";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { takeRedo } from "@/lib/redoTemplate";
import { downloadExcel } from "@/lib/calc/csvClient";
import { fmtDateISO } from "@/lib/calc/date";
import { AdjustReason } from "@prisma/client";

const REASONS: { value: AdjustReason; label: string }[] = [
  { value: "COUNT_VARIANCE", label: "Count variance (นับพบผลต่าง)" },
  { value: "DAMAGED", label: "Damaged (ชำรุด)" },
  { value: "EXPIRED", label: "Expired (หมดอายุ)" },
  { value: "QC_REJECT", label: "QC reject (ตัด QC)" },
];

type Line = LotOption & { counted: string };

export function AdjustForm({ lots }: { lots: LotOption[] }) {
  const router = useRouter();
  const [reason, setReason] = useState<AdjustReason>("COUNT_VARIANCE");
  const [note, setNote] = useState("");
  const [docDate, setDocDate] = useState(fmtDateISO(new Date()));
  const [lines, setLines] = useState<Line[]>([]);
  const [popup, setPopup] = useState<{ kind: "adjust" | "draft"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = lots.filter((l) => !lines.some((x) => x.id === l.id));

  // Prefill from a "Redo" of a reversed adjustment (one-shot, client-only storage).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = takeRedo<{ reason: AdjustReason; lines: { lotId: string; counted: string }[] }>("adjustment");
    if (!p) return;
    if (p.reason) setReason(p.reason);
    setLines(
      p.lines
        .map((pl) => {
          const lot = lots.find((l) => l.id === pl.lotId);
          return lot ? { ...lot, counted: pl.counted } : null;
        })
        .filter((x): x is Line => x !== null)
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lots]);

  function addLine(id: string) {
    const lot = lots.find((l) => l.id === id);
    if (!lot) return;
    setLines((ls) => [...ls, { ...lot, counted: String(lot.qty) }]);
  }
  function updateLine(i: number, counted: string) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, counted } : l)));
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  const lossValue = lines.reduce((s, l) => {
    const variance = (Number(l.counted) || 0) - l.qty;
    return variance < 0 ? s + -variance * l.price : s;
  }, 0);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await confirmAdjustAction({
        reason,
        docDate,
        note,
        lines: lines.map((l) => ({ lotId: l.id, countedQty: Number(l.counted) || 0 })),
      });
      setPopup({ kind: "adjust", message: `Adjustment ${res.docNo} confirmed — stock updated.` });
      setLines([]);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm adjustment.");
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    downloadExcel(
      "adjust-draft.xls",
      "Adjustment",
      ["SAP Material Master", "Material Description", "Lot", "Location", "SysQty", "CountedQty", "Variance"],
      lines.map((l) => [
        l.productCode,
        l.name,
        l.lotNo,
        l.locationCode,
        l.qty,
        Number(l.counted) || 0,
        (Number(l.counted) || 0) - l.qty,
      ])
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eef1f5] p-[18px_22px]">
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Adjustment No. · auto</div>
            <div className="font-num text-[16px] font-semibold text-[#2f86cf]">next on confirm</div>
          </div>
          <div className="h-[34px] w-px bg-[#e2e6ec]" />
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Reason (เหตุผล)</div>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustReason)}
              className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 text-[11.5px] text-[#69748a]">หมายเหตุ / สาเหตุ (Note — เพราะอะไร)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น สินค้าเสียหายจากน้ำท่วม, นับผิด, ตกหล่น…"
              className="w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#2f86cf]"
            />
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3.5 py-2 text-[12.5px] font-semibold text-[#0c7f93]">
            ⤓ Export Excel
          </button>
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Doc date</div>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[10px_16px] text-[11.5px] font-medium">SAP Material Master</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Material Description</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Lot</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Location</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">System</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">ตัดออก/เสีย (Loss)</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">คงเหลือ (Counted)</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">Variance</th>
                <th className="w-10 p-[10px_16px]"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const variance = (Number(l.counted) || 0) - l.qty;
                return (
                  <tr key={l.id} className="border-t border-[#eef1f5]">
                    <td className="font-num p-[11px_16px] text-[12px] text-[#3a4658]">{l.productCode}</td>
                    <td className="p-[11px_16px] font-medium">{l.name}</td>
                    <td className="font-num p-[11px_16px] text-[12px]">{l.lotNo}</td>
                    <td className="font-num p-[11px_16px] text-[12px]">{l.locationCode}</td>
                    <td className="font-num p-[11px_16px] text-right">{l.qty.toLocaleString()}</td>
                    <td className="p-[11px_16px] text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          value={String(Math.max(0, l.qty - (Number(l.counted) || 0)))}
                          onChange={(e) =>
                            updateLine(i, String(Math.max(0, l.qty - (Number(e.target.value) || 0))))
                          }
                          className="font-num w-[70px] rounded-[7px] border border-[#e2b4b4] bg-[#fdf6f6] px-2 py-1.5 text-right text-[13px] text-[#c0453f]"
                        />
                        <button
                          type="button"
                          onClick={() => updateLine(i, "0")}
                          title="เสียทั้งหมด → คงเหลือ 0 (ของจะหายจาก Location)"
                          className="rounded-[6px] border border-[#e2b4b4] bg-white px-1.5 py-1 text-[10.5px] font-semibold text-[#c0453f] hover:bg-[#fbe9e9]"
                        >
                          ทั้งหมด
                        </button>
                      </div>
                    </td>
                    <td className="p-[11px_16px] text-right">
                      <input
                        value={l.counted}
                        onChange={(e) => updateLine(i, e.target.value)}
                        className="font-num w-[84px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-right text-[13px]"
                      />
                    </td>
                    <td
                      className="font-num p-[11px_16px] text-right font-semibold"
                      style={{ color: variance > 0 ? "#1f66a6" : variance < 0 ? "#d24141" : "#9aa4b4" }}
                    >
                      {variance > 0 ? `+${variance}` : variance}
                    </td>
                    <td className="p-[11px_16px] text-center">
                      <button onClick={() => removeLine(i)} className="text-[16px] text-[#c2606f]">
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-[#9aa4b4]">
                    No lines yet — add a lot below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 border-t border-[#eef1f5] p-[12px_16px]">
          <SearchableSelect
            options={available.map((l) => ({
              value: l.id,
              label: `${l.productCode} · ${l.name} · ${l.lotNo} · ${l.locationCode}`,
            }))}
            onSelect={addLine}
            placeholder="+ Add line (เพิ่มรายการ) — พิมพ์ค้นหาสินค้า…"
          />
        </div>

        {lossValue > 0 && (
          <div className="flex items-center gap-3 border-t border-[#eef1f5] bg-[#fdf6f6] p-[12px_22px]">
            <span className="text-[15px]">▼</span>
            <div className="flex-1 text-[12.5px] text-[#a34141]">
              Loss value from negative variance (มูลค่าสูญเสียจากผลต่างติดลบ)
            </div>
            <div className="font-num text-[16px] font-bold text-[#d24141]">
              ฿{Math.round(lossValue).toLocaleString()}
            </div>
          </div>
        )}

        {error && (
          <div className="border-t border-[#f3d2d2] bg-[#fbe9e9] px-[22px] py-2.5 text-[12.5px] text-[#c53f3f]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-[#eef1f5] bg-[#fafbfc] p-[16px_22px]">
          <div className="text-[12.5px] text-[#69748a]">{lines.length} lines</div>
          <div className="flex-1" />
          <button
            onClick={() => setPopup({ kind: "draft", message: "Draft saved locally (not yet posted)." })}
            className={buttonClass("secondary")}
          >
            Save draft (ร่าง)
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || lines.length === 0}
            className={buttonClass("primary")}
          >
            {saving ? "Saving…" : "Confirm adjust (ยืนยันปรับปรุง)"}
          </button>
        </div>
      </div>

      {popup && <CuteBoxPopup open kind={popup.kind} message={popup.message} onClose={() => setPopup(null)} />}
    </>
  );
}
