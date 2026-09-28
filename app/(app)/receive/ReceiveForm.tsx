"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiveFormData } from "@/lib/views/receive";
import { confirmReceiptAction, ReceiveLineInput } from "@/lib/actions/receive";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup, CuteBoxKind } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { takeRedo } from "@/lib/redoTemplate";
import { fmtDateISO } from "@/lib/calc/date";

type Line = {
  productCode: string;
  name: string;
  unit: string;
  ordered: number | null;
  recv: string;
  lot: string;
  loc: string;
  mfg: string;
  exp: string;
};

export function ReceiveForm({ data }: { data: ReceiveFormData }) {
  const router = useRouter();
  const [poId, setPoId] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [materialDoc, setMaterialDoc] = useState("");
  const [remark, setRemark] = useState("");
  const [docDate, setDocDate] = useState(fmtDateISO(new Date()));
  const [lines, setLines] = useState<Line[]>([]);
  const [popup, setPopup] = useState<{ kind: CuteBoxKind; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPo = data.pos.find((p) => p.id === poId) ?? null;

  // Prefill from a "Redo" of a reversed receipt (one-shot, client-only storage).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = takeRedo<{
      poId: string | null;
      invoiceNo: string;
      lines: Omit<Line, "name" | "unit">[];
    }>("receipt");
    if (!p) return;
    setPoId(p.poId ?? "");
    setInvoiceNo(p.invoiceNo ?? "");
    setLines(
      p.lines.map((l) => {
        const prod = data.products.find((x) => x.code === l.productCode);
        return { ...l, name: prod?.name ?? l.productCode, unit: prod?.unit ?? "" };
      })
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data.products]);

  function selectPo(id: string) {
    setPoId(id);
    const po = data.pos.find((p) => p.id === id);
    if (po) {
      setLines(
        po.lines
          .filter((l) => l.remaining > 0)
          .map((l) => ({
            productCode: l.productCode,
            name: l.name,
            unit: l.unit,
            ordered: l.remaining,
            recv: String(l.remaining),
            lot: "",
            loc: "",
            mfg: "",
            exp: "",
          }))
      );
    } else {
      setLines([]);
    }
  }

  function addLine(code: string) {
    const p = data.products.find((x) => x.code === code);
    if (!p) return;
    setLines((ls) => [
      ...ls,
      { productCode: p.code, name: p.name, unit: p.unit, ordered: null, recv: "0", lot: "", loc: "", mfg: "", exp: "" },
    ]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  // Re-receiving a lot that was received before? Auto-fill its Mfg/Expiry from
  // the last time it came in — exact product+lot first, then any lot with that
  // number. Only fills a date the known lot actually has, so it never blanks a
  // date you've already typed, and a brand-new lot leaves your entries untouched.
  function changeLot(i: number, lot: string) {
    setLines((ls) =>
      ls.map((l, idx) => {
        if (idx !== i) return l;
        const meta = data.lotMeta[`${l.productCode}||${lot}`] ?? data.lotMeta[lot];
        if (!meta) return { ...l, lot };
        return { ...l, lot, mfg: meta.mfg ?? l.mfg, exp: meta.exp ?? l.exp };
      })
    );
  }

  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  // Receive the same product across a second lot: clone the line with an empty
  // lot and zero qty right below it, so one PO line can land in multiple lots.
  function splitLine(i: number) {
    setLines((ls) => {
      const clone: Line = { ...ls[i], ordered: null, recv: "0", lot: "", mfg: "", exp: "" };
      const next = [...ls];
      next.splice(i + 1, 0, clone);
      return next;
    });
  }

  const totalQty = lines.reduce((s, l) => s + (Number(l.recv) || 0), 0);

  async function handleConfirm() {
    setError(null);

    if (data.locations.length === 0) {
      setError(
        "No storage locations exist yet — add one on the Locations page first (ยังไม่มีที่จัดเก็บ กรุณาเพิ่ม Location ก่อน)"
      );
      return;
    }
    const missingLoc = lines.some((l) => !l.loc);
    if (missingLoc) {
      setError("Every line needs a Location selected (ทุกรายการต้องเลือก Location)");
      return;
    }

    setSaving(true);
    const payload = {
      mode: "PO" as const,
      poId: poId || null,
      invoiceNo,
      materialDoc: materialDoc || null,
      remark: remark || null,
      docDate,
      lines: lines.map(
        (l): ReceiveLineInput => ({
          productCode: l.productCode,
          orderedQty: l.ordered,
          recvQty: Number(l.recv) || 0,
          lotNo: l.lot,
          locationCode: l.loc,
          mfgDate: l.mfg || null,
          expDate: l.exp || null,
        })
      ),
    };
    try {
      const res = await confirmReceiptAction(payload);
      if (res.error) {
        setError(res.error);
      } else {
        setPopup({ kind: "in", message: `Receipt ${res.docNo} confirmed — inventory updated.` });
        setLines([]);
        setPoId("");
        setInvoiceNo("");
        setMaterialDoc("");
        setRemark("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm receipt.");
    } finally {
      setSaving(false);
    }
  }

  function handleDraft() {
    setPopup({ kind: "draft", message: "Draft saved locally (not yet posted to inventory)." });
  }

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eef1f5] p-[18px_22px]">
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Receipt No. (เลขที่รับ) · auto</div>
            <div className="font-num text-[16px] font-semibold text-[#2f86cf]">{data.docNo}</div>
          </div>
          <div className="h-[34px] w-px bg-[#e2e6ec]" />
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">PO Reference (อ้างอิง PO) · optional</div>
            <div className="w-[230px]">
              <SearchableSelect
                value={
                  poId
                    ? (() => {
                        const p = data.pos.find((x) => x.id === poId);
                        return p ? `${p.no} · ${p.vendor}` : "";
                      })()
                    : "No PO (ไม่ระบุ PO)"
                }
                options={[
                  { value: "", label: "No PO (ไม่ระบุ PO)" },
                  ...data.pos.map((p) => ({ value: p.id, label: `${p.no} · ${p.vendor}` })),
                ]}
                onSelect={selectPo}
                placeholder="พิมพ์ค้นหา PO / ผู้ขาย…"
                className="font-num w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#2f86cf]"
              />
            </div>
          </div>
          <div className="h-[34px] w-px bg-[#e2e6ec]" />
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Invoice / DO No. (เลขที่ Invoice)</div>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="INV-2569-…"
              className="font-num w-[150px] rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div className="h-[34px] w-px bg-[#e2e6ec]" />
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Material Document (SAP)</div>
            <input
              value={materialDoc}
              onChange={(e) => setMaterialDoc(e.target.value)}
              placeholder="เลขที่จาก SAP"
              className="font-num w-[170px] rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <div className="mb-1 text-[11.5px] text-[#69748a]">Remark (หมายเหตุ)</div>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม"
              className="w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Doc date (วันที่เอกสาร)</div>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <datalist id="nbLots">
            {data.lotOptions.map((lo) => (
              <option key={lo} value={lo} />
            ))}
          </datalist>
          <datalist id="nbLocs">
            {data.locations.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[10px_16px] text-[11.5px] font-medium">SAP Material Master</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Material Description</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">Ordered (สั่งตาม PO)</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">Received (รับจริง)</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Lot</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Location</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Mfg</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Expiry</th>
                <th className="w-10 p-[10px_16px]"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-[#eef1f5]">
                  <td className="font-num p-[11px_16px] text-[12px] text-[#3a4658]">{l.productCode}</td>
                  <td className="p-[11px_16px] font-medium">{l.name}</td>
                  <td className="font-num p-[11px_16px] text-right text-[12.5px] text-[#69748a]">
                    {l.ordered != null ? l.ordered.toLocaleString() : "—"}
                  </td>
                  <td className="p-[11px_16px] text-right">
                    <input
                      value={l.recv}
                      onChange={(e) => updateLine(i, { recv: e.target.value })}
                      className="font-num w-[74px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-right text-[13px]"
                    />
                  </td>
                  <td className="p-[11px_16px]">
                    <input
                      value={l.lot}
                      onChange={(e) => changeLot(i, e.target.value)}
                      list="nbLots"
                      title="ล็อตที่เคยรับ จะเติมวันผลิต/หมดอายุให้อัตโนมัติ"
                      className="font-num w-[118px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-[12px]"
                    />
                  </td>
                  <td className="p-[11px_16px]">
                    <input
                      value={l.loc}
                      onChange={(e) => updateLine(i, { loc: e.target.value })}
                      list="nbLocs"
                      placeholder="พิมพ์/เลือก"
                      className="font-num w-[100px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-[12px]"
                    />
                  </td>
                  <td className="p-[11px_16px]">
                    <input
                      type="date"
                      value={l.mfg}
                      onChange={(e) => updateLine(i, { mfg: e.target.value })}
                      className="font-num rounded-[7px] border border-[#d7dce4] px-2 py-1 text-[12px]"
                    />
                  </td>
                  <td className="p-[11px_16px]">
                    <input
                      type="date"
                      value={l.exp}
                      onChange={(e) => updateLine(i, { exp: e.target.value })}
                      className="font-num rounded-[7px] border border-[#d7dce4] px-2 py-1 text-[12px]"
                    />
                  </td>
                  <td className="p-[11px_16px] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => splitLine(i)}
                        title="รับอีก Lot ของสินค้าตัวนี้ (split into another lot)"
                        className="rounded-[6px] border border-[#cfe6d9] bg-[#e8f2fb] px-2 py-0.5 text-[13px] font-semibold text-[#0c7f93] hover:bg-[#d6eef4]"
                      >
                        ＋Lot
                      </button>
                      <button onClick={() => removeLine(i)} className="text-[16px] text-[#c2606f]">
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-[#9aa4b4]">
                    {selectedPo ? "This PO has nothing outstanding." : "No lines yet — add a product below."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 border-t border-[#eef1f5] p-[12px_16px]">
          <SearchableSelect
            options={data.products.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
            onSelect={addLine}
            placeholder="+ Add line (เพิ่มรายการ) — พิมพ์ค้นหาสินค้า…"
          />
        </div>

        {error && (
          <div className="border-t border-[#f3d2d2] bg-[#fbe9e9] px-[22px] py-2.5 text-[12.5px] text-[#c53f3f]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-[#eef1f5] bg-[#fafbfc] p-[16px_22px]">
          <div className="text-[12.5px] text-[#69748a]">
            {lines.length} lines · total received{" "}
            <b className="font-num text-[#16202e]">{totalQty.toLocaleString()}</b>
          </div>
          <div className="flex-1" />
          <button onClick={handleDraft} className={buttonClass("secondary")}>
            Save draft (ร่าง)
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || lines.length === 0}
            className={buttonClass("primary", "!bg-[#1f66a6]")}
          >
            {saving ? "Saving…" : "Confirm receipt (ยืนยันรับ)"}
          </button>
        </div>
      </div>

      {popup && (
        <CuteBoxPopup open kind={popup.kind} message={popup.message} onClose={() => setPopup(null)} />
      )}
    </>
  );
}
