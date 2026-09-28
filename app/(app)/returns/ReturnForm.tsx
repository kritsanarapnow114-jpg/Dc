"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReturnFormData } from "@/lib/views/returns";
import { confirmReturnAction, ReturnDispositionInput, ReturnLineInput } from "@/lib/actions/returns";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup, CuteBoxKind } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { takeRedo } from "@/lib/redoTemplate";
import { fmtDateBE, fmtDateISO } from "@/lib/calc/date";

type Line = {
  productCode: string;
  name: string;
  unit: string;
  lotNo: string;
  qty: string;
  disposition: ReturnDispositionInput;
  loc: string;
  mfg: string;
  exp: string;
};

const DISPOSITIONS: { value: ReturnDispositionInput; label: string; hint: string; on: string }[] = [
  {
    value: "RESTOCK",
    label: "คืนสต็อก",
    hint: "สภาพดี ขายต่อได้",
    on: "border-[#a8d9bd] bg-[#e2f0e8] text-[#177a4a]",
  },
  {
    value: "HOLD",
    label: "กักตรวจ (QC)",
    hint: "เก็บไว้ ห้ามจ่าย",
    on: "border-[#e0c08a] bg-[#fbf1df] text-[#8a5a0a]",
  },
  {
    value: "SCRAP",
    label: "ตัดทิ้ง",
    hint: "เสียหาย ไม่เข้าสต็อก",
    on: "border-[#f3c4c4] bg-[#fbe9e9] text-[#b13c3c]",
  },
];

const input = "font-num w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#d71f28]";

export function ReturnForm({ data }: { data: ReturnFormData }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [issueId, setIssueId] = useState("");
  const [reason, setReason] = useState(data.reasons[0] ?? "");
  const [remark, setRemark] = useState("");
  const [docDate, setDocDate] = useState(fmtDateISO(new Date()));
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ kind: CuteBoxKind; message: string } | null>(null);

  // Prefill from a "Redo" of a reversed return (one-shot, client-only storage).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = takeRedo<{
      customerId: string | null;
      issueId: string | null;
      reason: string;
      remark: string;
      lines: Omit<Line, "name" | "unit">[];
    }>("return");
    if (!p) return;
    setCustomerId(p.customerId ?? "");
    setIssueId(p.issueId ?? "");
    if (p.reason) setReason(p.reason);
    setRemark(p.remark ?? "");
    setLines(
      p.lines.map((l) => {
        const prod = data.products.find((x) => x.code === l.productCode);
        return { ...l, name: prod?.name ?? l.productCode, unit: prod?.unit ?? "" };
      })
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data.products]);

  const customer = data.customers.find((c) => c.id === customerId) ?? null;
  const shipments = customerId ? data.shipments.filter((s) => s.customerId === customerId) : data.shipments;
  const shipment = data.shipments.find((s) => s.id === issueId) ?? null;

  function pickShipment(id: string) {
    setIssueId(id);
    const s = data.shipments.find((x) => x.id === id);
    if (s?.customerId) setCustomerId(s.customerId);
  }

  function addFromShipment(i: number) {
    if (!shipment) return;
    const l = shipment.lines[i];
    setLines((ls) => [
      ...ls,
      {
        productCode: l.productCode,
        name: l.name,
        unit: l.unit,
        lotNo: l.lotNo,
        qty: String(l.qty),
        disposition: "RESTOCK",
        loc: l.locationCode,
        mfg: l.mfgDate,
        exp: l.expDate,
      },
    ]);
  }

  function addProduct(code: string) {
    const p = data.products.find((x) => x.code === code);
    if (!p) return;
    setLines((ls) => [
      ...ls,
      { productCode: p.code, name: p.name, unit: p.unit, lotNo: "", qty: "0", disposition: "RESTOCK", loc: "", mfg: "", exp: "" },
    ]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  async function handleConfirm() {
    setError(null);
    if (lines.some((l) => l.disposition !== "SCRAP" && !l.loc)) {
      setError("รายการที่คืนสต็อก/กักตรวจ ต้องเลือก Location (restock/hold lines need a location)");
      return;
    }
    setSaving(true);
    try {
      const res = await confirmReturnAction({
        customerId: customerId || null,
        issueId: issueId || null,
        reason,
        remark: remark || null,
        docDate,
        lines: lines.map(
          (l): ReturnLineInput => ({
            productCode: l.productCode,
            lotNo: l.lotNo,
            qty: Number(l.qty) || 0,
            disposition: l.disposition,
            locationCode: l.disposition === "SCRAP" ? null : l.loc,
            mfgDate: l.mfg || null,
            expDate: l.exp || null,
          })
        ),
      });
      if (res.error) {
        setError(res.error);
      } else {
        setPopup({ kind: "in", message: `รับคืน ${res.docNo} แล้ว — อัปเดตสต็อกเรียบร้อย` });
        setLines([]);
        setIssueId("");
        setRemark("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <datalist id="rtLocs">
        {data.locations.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <div className="grid gap-4 border-b border-[#eef1f5] p-[18px_22px] sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Return No. (เลขที่รับคืน) · auto</div>
            <div className="font-num text-[16px] font-semibold text-[#bd6f12]">{data.docNo}</div>
          </div>
          <label className="block">
            <div className="mb-1 text-[11.5px] text-[#69748a]">Doc date (วันที่รับคืน)</div>
            <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={input} />
          </label>
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Customer (ลูกค้า)</div>
            <SearchableSelect
              value={customer ? customer.name : "— ไม่ระบุ —"}
              options={[
                { value: "", label: "— ไม่ระบุ —" },
                ...data.customers.map((c) => ({ value: c.id, label: c.code ? `${c.code} · ${c.name}` : c.name })),
              ]}
              onSelect={(v) => {
                setCustomerId(v);
                if (shipment && shipment.customerId !== v) setIssueId("");
              }}
              placeholder="พิมพ์ค้นหาลูกค้า…"
              className={input}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-1 text-[11.5px] text-[#69748a]">Ref. shipment (ใบจ่าย/ส่งของเดิม) · optional</div>
            <SearchableSelect
              value={shipment ? `${shipment.docNo} · ${fmtDateBE(new Date(shipment.docDate))}` : "— ไม่อ้างอิง —"}
              options={[
                { value: "", label: "— ไม่อ้างอิง —" },
                ...shipments.map((s) => ({
                  value: s.id,
                  label: `${s.docNo} · ${fmtDateBE(new Date(s.docDate))} · ${s.customerName || "-"}${s.shipOrderNo ? ` · ${s.shipOrderNo}` : ""}`,
                })),
              ]}
              onSelect={pickShipment}
              placeholder="พิมพ์ค้นหาเลขเอกสาร / ลูกค้า…"
              className={input}
            />
          </div>
          <label className="block">
            <div className="mb-1 text-[11.5px] text-[#69748a]">Reason (เหตุผลการคืน)</div>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={input}>
              {data.reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="mb-1 text-[11.5px] text-[#69748a]">Remark (หมายเหตุ)</div>
            <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="เช่น เลข CN / ทะเบียนรถ" className={input} />
          </label>
        </div>

        {shipment && shipment.lines.length > 0 && (
          <div className="border-b border-[#eef1f5] bg-[#f7f9fb] p-[12px_22px]">
            <div className="mb-2 text-[12px] font-semibold text-[#3a4658]">
              รายการในใบ {shipment.docNo} — แตะเพื่อเพิ่มเป็นรายการคืน
            </div>
            <div className="flex flex-wrap gap-2">
              {shipment.lines.map((l, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addFromShipment(i)}
                  className="rounded-[9px] border border-[#d7dce4] bg-white px-3 py-2 text-left text-[12px] hover:border-[#d71f28]"
                >
                  <span className="block font-medium text-[#16202e]">＋ {l.name}</span>
                  <span className="font-num text-[11px] text-[#69748a]">
                    Lot {l.lotNo} · {l.qty.toLocaleString()} {l.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 p-[14px_16px]">
          {lines.map((l, i) => (
            <div key={i} className="rounded-[12px] border border-[#e7ebf1] p-3">
              <div className="mb-2 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{l.name}</div>
                  <div className="font-num text-[11.5px] text-[#9aa4b4]">{l.productCode}</div>
                </div>
                <button onClick={() => removeLine(i)} className="px-1 text-[18px] leading-none text-[#c2606f]" aria-label="ลบรายการ">
                  ×
                </button>
              </div>

              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {DISPOSITIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => updateLine(i, { disposition: d.value })}
                    className={`rounded-[9px] border px-2 py-2 text-center text-[12px] font-semibold ${
                      l.disposition === d.value ? d.on : "border-[#d7dce4] bg-white text-[#69748a]"
                    }`}
                  >
                    {d.label}
                    <span className="block text-[10px] font-normal opacity-80">{d.hint}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <label className="block">
                  <span className="text-[11px] text-[#69748a]">จำนวน ({l.unit})</span>
                  <input value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} inputMode="decimal" className={`${input} text-right`} />
                </label>
                <label className="block">
                  <span className="text-[11px] text-[#69748a]">Lot</span>
                  <input value={l.lotNo} onChange={(e) => updateLine(i, { lotNo: e.target.value })} className={input} />
                </label>
                <label className="block">
                  <span className="text-[11px] text-[#69748a]">Location {l.disposition === "SCRAP" ? "(ไม่ใช้)" : ""}</span>
                  <input
                    value={l.disposition === "SCRAP" ? "" : l.loc}
                    onChange={(e) => updateLine(i, { loc: e.target.value })}
                    list="rtLocs"
                    disabled={l.disposition === "SCRAP"}
                    placeholder={l.disposition === "HOLD" ? "เช่น โซนกักตรวจ" : "พิมพ์/เลือก"}
                    className={`${input} disabled:bg-[#f1f3f7]`}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-[#69748a]">Mfg</span>
                  <input type="date" value={l.mfg} onChange={(e) => updateLine(i, { mfg: e.target.value })} className={input} />
                </label>
                <label className="block">
                  <span className="text-[11px] text-[#69748a]">Expiry</span>
                  <input type="date" value={l.exp} onChange={(e) => updateLine(i, { exp: e.target.value })} className={input} />
                </label>
              </div>
            </div>
          ))}

          {lines.length === 0 && (
            <div className="rounded-[12px] border border-dashed border-[#d7dce4] p-6 text-center text-[12.5px] text-[#9aa4b4]">
              ยังไม่มีรายการ — เลือกใบส่งของเดิมด้านบน หรือเพิ่มสินค้าด้านล่าง
            </div>
          )}

          <SearchableSelect
            options={data.products.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
            onSelect={addProduct}
            placeholder="+ เพิ่มสินค้าที่คืน — พิมพ์ค้นหา…"
          />
        </div>

        {error && (
          <div className="border-t border-[#f3d2d2] bg-[#fbe9e9] px-[22px] py-2.5 text-[12.5px] text-[#c53f3f]">{error}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-[#eef1f5] bg-[#fafbfc] p-[16px_22px]">
          <div className="text-[12.5px] text-[#69748a]">
            {lines.length} รายการ · รวม <b className="font-num text-[#16202e]">{totalQty.toLocaleString()}</b>
          </div>
          <div className="flex-1" />
          <button
            onClick={handleConfirm}
            disabled={saving || lines.length === 0}
            className={buttonClass("primary", "w-full !bg-[#bd6f12] !py-2.5 sm:w-auto")}
          >
            {saving ? "Saving…" : "ยืนยันรับคืน (Confirm return)"}
          </button>
        </div>
      </div>

      {popup && <CuteBoxPopup open kind={popup.kind} message={popup.message} onClose={() => setPopup(null)} />}
    </>
  );
}
