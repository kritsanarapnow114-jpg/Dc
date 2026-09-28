"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LotOption } from "@/lib/views/docCommon";
import { confirmTransferAction } from "@/lib/actions/transfer";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { takeRedo } from "@/lib/redoTemplate";
import { downloadExcel } from "@/lib/calc/csvClient";
import { printTable } from "@/lib/calc/printClient";
import { fmtDateISO } from "@/lib/calc/date";

type Line = LotOption & { toLocationCode: string; moveQty: string };

export function TransferForm({
  lots,
  locations,
  operators,
}: {
  lots: LotOption[];
  locations: string[];
  operators: string[];
}) {
  const router = useRouter();
  const [operator, setOperator] = useState(operators[0] ?? "");
  const [docDate, setDocDate] = useState(fmtDateISO(new Date()));
  const [lines, setLines] = useState<Line[]>([]);
  const [popup, setPopup] = useState<{ kind: "transfer" | "draft"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = lots.filter((l) => !lines.some((x) => x.id === l.id));

  // Prefill from a "Redo" of a reversed transfer (one-shot, client-only storage).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = takeRedo<{ lines: { lotId: string; toLocationCode: string; moveQty: string }[] }>("transfer");
    if (!p) return;
    setLines(
      p.lines
        .map((pl) => {
          const lot = lots.find((l) => l.id === pl.lotId);
          return lot ? { ...lot, toLocationCode: pl.toLocationCode, moveQty: pl.moveQty } : null;
        })
        .filter((x): x is Line => x !== null)
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lots]);

  function addLine(id: string) {
    const lot = lots.find((l) => l.id === id);
    if (!lot) return;
    const otherLoc = locations.find((c) => c !== lot.locationCode) ?? lot.locationCode;
    setLines((ls) => [...ls, { ...lot, toLocationCode: otherLoc, moveQty: String(lot.qty) }]);
  }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }
  // Split one lot across another destination location: duplicate the row for the
  // same lot, pick an unused "To", and share the quantity between the two rows.
  function splitLine(i: number) {
    setLines((ls) => {
      const src = ls[i];
      const usedTo = ls.filter((l) => l.id === src.id).map((l) => l.toLocationCode);
      const nextTo =
        locations.find((c) => c !== src.locationCode && !usedTo.includes(c)) ??
        locations.find((c) => c !== src.locationCode) ??
        src.toLocationCode;
      const cur = Number(src.moveQty) || 0;
      const half = Math.floor(cur / 2);
      const copy = [...ls];
      copy[i] = { ...src, moveQty: String(cur - half) };
      copy.splice(i + 1, 0, { ...src, toLocationCode: nextTo, moveQty: String(half) });
      return copy;
    });
  }

  // Validate: per source lot, the total moved must not exceed what's on hand.
  const lotError: string | null = (() => {
    const moved = new Map<string, { qty: number; sum: number }>();
    for (const l of lines) {
      const g = moved.get(l.id) ?? { qty: l.qty, sum: 0 };
      g.sum += Number(l.moveQty) || 0;
      moved.set(l.id, g);
    }
    for (const l of lines) {
      if (l.toLocationCode === l.locationCode) return `ปลายทางต้องต่างจากต้นทาง (${l.lotNo})`;
      if ((Number(l.moveQty) || 0) <= 0) return `จำนวนต้องมากกว่า 0 (${l.lotNo})`;
    }
    for (const [, g] of moved) {
      if (g.sum > g.qty) return `ย้ายเกินจำนวนคงเหลือ — มี ${g.qty.toLocaleString()}, ย้ายรวม ${g.sum.toLocaleString()}`;
    }
    return null;
  })();

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await confirmTransferAction({
        operator,
        docDate,
        lines: lines.map((l) => ({
          lotId: l.id,
          toLocationCode: l.toLocationCode,
          qty: Number(l.moveQty) || 0,
        })),
      });
      setPopup({ kind: "transfer", message: `Transfer ${res.docNo} confirmed — locations updated.` });
      setLines([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm transfer.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    printTable({
      title: "Transfer Slip (ใบย้ายที่เก็บ)",
      meta: [`Operator: ${operator}`, `Date: ${docDate}`],
      headers: ["SAP Material Master", "Material Description", "Lot", "From", "To", "Qty"],
      rows: lines.map((l) => [l.productCode, l.name, l.lotNo, l.locationCode, l.toLocationCode, `${l.moveQty} ${l.unit}`]),
    });
  }

  function handleExport() {
    downloadExcel(
      "transfer-draft.xls",
      "Transfer",
      ["SAP Material Master", "Material Description", "Lot", "From", "To", "Qty"],
      lines.map((l) => [l.productCode, l.name, l.lotNo, l.locationCode, l.toLocationCode, l.moveQty])
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eef1f5] p-[18px_22px]">
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Transfer No. · auto</div>
            <div className="font-num text-[16px] font-semibold text-[#2f86cf]">next on confirm</div>
          </div>
          <div className="h-[34px] w-px bg-[#e2e6ec]" />
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Operator (ผู้ปฏิบัติงาน)</div>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            >
              {operators.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
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

        <datalist id="trfLocs">
          {locations.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[10px_16px] text-[11.5px] font-medium">SAP Material Master</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Material Description</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Lot</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">From</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">To</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">Qty</th>
                <th className="w-10 p-[10px_16px]"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-[#eef1f5]">
                  <td className="font-num p-[11px_16px] text-[12px] text-[#3a4658]">{l.productCode}</td>
                  <td className="p-[11px_16px] font-medium">{l.name}</td>
                  <td className="font-num p-[11px_16px] text-[12px]">{l.lotNo}</td>
                  <td className="font-num p-[11px_16px] text-[12px]">{l.locationCode}</td>
                  <td className="p-[11px_16px]">
                    <input
                      value={l.toLocationCode}
                      onChange={(e) => updateLine(i, { toLocationCode: e.target.value })}
                      list="trfLocs"
                      placeholder="พิมพ์/เลือก"
                      className="font-num w-[110px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-[12px]"
                    />
                  </td>
                  <td className="p-[11px_16px] text-right">
                    <input
                      value={l.moveQty}
                      onChange={(e) => updateLine(i, { moveQty: e.target.value })}
                      className="font-num w-[84px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-right text-[13px]"
                    />{" "}
                    <span className="text-[11px] text-[#9aa4b4]">/{l.qty} {l.unit}</span>
                  </td>
                  <td className="whitespace-nowrap p-[11px_16px] text-center">
                    <button
                      onClick={() => splitLine(i)}
                      title="ย้ายไปอีกที่เก็บ (split to another location)"
                      className="mr-1 rounded-[6px] border border-[#bfe3d8] bg-[#e9f9fc] px-1.5 py-1 text-[11px] font-semibold text-[#2f86cf]"
                    >
                      + ที่เก็บ
                    </button>
                    <button onClick={() => removeLine(i)} className="text-[16px] text-[#c2606f]">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#9aa4b4]">
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

        {(error || lotError) && (
          <div className="border-t border-[#f3d2d2] bg-[#fbe9e9] px-[22px] py-2.5 text-[12.5px] text-[#c53f3f]">
            {error || lotError}
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-[#eef1f5] bg-[#fafbfc] p-[16px_22px]">
          <div className="text-[12.5px] text-[#69748a]">{lines.length} lines</div>
          <div className="flex-1" />
          <button onClick={handlePrint} className={buttonClass("secondary")}>
            ⎙ Print
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || lines.length === 0 || !!lotError}
            className={buttonClass("primary", "!bg-[#2f86cf]")}
          >
            {saving ? "Saving…" : "Confirm transfer (ยืนยันย้าย)"}
          </button>
        </div>
      </div>

      {popup && <CuteBoxPopup open kind={popup.kind} message={popup.message} onClose={() => setPopup(null)} />}
    </>
  );
}
