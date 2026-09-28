"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IssueFormData } from "@/lib/views/issue";
import { confirmIssueAction, IssueLineInput } from "@/lib/actions/issue";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup, CuteBoxKind } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { takeRedo } from "@/lib/redoTemplate";
import { printTable } from "@/lib/calc/printClient";
import { fmtDateISO, fmtDateBE } from "@/lib/calc/date";

type Line = IssueFormData["products"][number] & { selectedLotId: string; qty: string };

export function IssueForm({ data, issueToOptions }: { data: IssueFormData; issueToOptions: string[] }) {
  const router = useRouter();
  const ISSUE_TO_OPTIONS = issueToOptions.length > 0 ? issueToOptions : ["-"];
  const [issueType, setIssueType] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [issueTo, setIssueTo] = useState(ISSUE_TO_OPTIONS[0]);
  const [customerId, setCustomerId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [materialDoc, setMaterialDoc] = useState("");
  const [remark, setRemark] = useState("");
  const [docDate, setDocDate] = useState(fmtDateISO(new Date()));
  const [lines, setLines] = useState<Line[]>([]);
  const [popup, setPopup] = useState<{ kind: CuteBoxKind; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastConfirmed, setLastConfirmed] = useState<
    { docNo: string; lines: Line[]; heading: string; shipToName: string; shipToAddress: string } | null
  >(null);

  const customers = data.customers ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const shipTos = selectedCustomer?.shipTos ?? [];
  const selectedShipTo = shipTos.find((s) => s.id === shipToId) ?? null;

  // Pick a customer → auto-select its default ship-to (or the first one).
  function selectCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    const def = c?.shipTos.find((s) => s.isDefault) ?? c?.shipTos[0];
    setShipToId(def?.id ?? "");
  }

  const available = data.products.filter((p) => !lines.some((l) => l.code === p.code));

  // Prefill from a "Redo" of a reversed issue (one-shot, client-only storage).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const p = takeRedo<{ issueTo: string; lines: { productCode: string; selectedLotId: string; qty: number }[] }>(
      "issue"
    );
    if (!p) return;
    if (p.issueTo) setIssueTo(p.issueTo);
    setLines(
      p.lines
        .map((pl) => {
          const prod = data.products.find((x) => x.code === pl.productCode);
          if (!prod) return null;
          return { ...prod, selectedLotId: pl.selectedLotId, qty: String(pl.qty) };
        })
        .filter((x): x is Line => x !== null)
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data.products]);

  function addLine(code: string) {
    const p = data.products.find((x) => x.code === code);
    if (!p) return;
    const defaultLot = p.lots.find((l) => l.isFefo) ?? p.lots[0];
    setLines((ls) => [
      ...ls,
      {
        ...p,
        selectedLotId: defaultLot?.id ?? "",
        qty: String(defaultLot?.qty ?? 0),
      },
    ]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  // Issue the same product from a second lot: clone the line and pick a lot not
  // already used for this product, so one issue can draw from multiple lots.
  function splitLine(i: number) {
    setLines((ls) => {
      const src = ls[i];
      const usedLotIds = new Set(ls.filter((l) => l.code === src.code).map((l) => l.selectedLotId));
      const nextLot = src.lots.find((lot) => !usedLotIds.has(lot.id)) ?? src.lots[0];
      const clone: Line = { ...src, selectedLotId: nextLot?.id ?? src.selectedLotId, qty: "0" };
      const next = [...ls];
      next.splice(i + 1, 0, clone);
      return next;
    });
  }

  const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const totalValue = lines.reduce((s, l) => s + (Number(l.qty) || 0) * l.price, 0);

  async function handleConfirm() {
    if (issueType === "EXTERNAL" && !customerId) {
      setError("กรุณาเลือกลูกค้าสำหรับการจ่ายภายนอก (external issue needs a customer)");
      return;
    }
    setSaving(true);
    const payload = {
      issueType,
      issueTo: issueType === "EXTERNAL" ? "ขายออกภายนอก (External)" : issueTo,
      customerId: issueType === "EXTERNAL" ? customerId || null : null,
      shipToId: issueType === "EXTERNAL" ? shipToId || null : null,
      materialDoc: materialDoc || null,
      remark: remark || null,
      docDate,
      lines: lines.map(
        (l): IssueLineInput => ({
          productCode: l.code,
          selectedLotId: l.selectedLotId,
          qty: Number(l.qty) || 0,
        })
      ),
    };
    try {
      const res = await confirmIssueAction(payload);
      if (res.error || !res.docNo) {
        setError(res.error ?? "Failed to confirm issue.");
      } else {
        setError(null);
        setPopup({ kind: "out", message: `Issue ${res.docNo} confirmed — stock deducted.` });
        setLastConfirmed({
          docNo: res.docNo,
          lines,
          heading: issueType === "EXTERNAL" ? "ขายออกภายนอก (External)" : issueTo,
          shipToName: issueType === "EXTERNAL" ? selectedCustomer?.name ?? "" : "",
          shipToAddress: issueType === "EXTERNAL" ? selectedShipTo?.address ?? "" : "",
        });
        setLines([]);
        setMaterialDoc("");
        setRemark("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm issue.");
    }
    setSaving(false);
  }

  function handleDraft() {
    setPopup({ kind: "draft", message: "Draft saved locally (not yet posted)." });
  }

  function handlePrint() {
    if (!lastConfirmed) return;
    printTable({
      title: `Issue Slip — ${lastConfirmed.docNo}`,
      meta: [
        `Issue To: ${lastConfirmed.heading}`,
        ...(lastConfirmed.shipToName ? [`Ship-to: ${lastConfirmed.shipToName}`] : []),
        ...(lastConfirmed.shipToAddress ? [`Address: ${lastConfirmed.shipToAddress}`] : []),
        `Date: ${docDate}`,
      ],
      headers: ["SAP Material Master", "Material Description", "Lot", "Qty"],
      rows: lastConfirmed.lines.map((l) => [
        l.code,
        l.name,
        l.lots.find((x) => x.id === l.selectedLotId)?.lotNo ?? "",
        `${l.qty} ${l.unit}`,
      ]),
      signatures: ["Issued by", "Received by"],
    });
  }

  return (
    <>
      <div className="mb-4 flex w-fit gap-2 rounded-[11px] bg-[#e5e9ef] p-1">
        <button
          onClick={() => setIssueType("INTERNAL")}
          className={`rounded-[9px] px-4 py-2 text-[13px] font-medium ${issueType === "INTERNAL" ? "bg-white shadow-sm" : "text-[#3a4658]"}`}
        >
          ภายใน (Internal)
        </button>
        <button
          onClick={() => setIssueType("EXTERNAL")}
          className={`rounded-[9px] px-4 py-2 text-[13px] font-medium ${issueType === "EXTERNAL" ? "bg-white shadow-sm" : "text-[#3a4658]"}`}
        >
          ภายนอก · ขายออก (External)
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eef1f5] p-[18px_22px]">
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Issue No. (เลขที่จ่าย) · auto</div>
            <div className="font-num text-[16px] font-semibold text-[#e5913a]">{data.docNo}</div>
          </div>
          {issueType === "INTERNAL" && (
            <>
              <div className="h-[34px] w-px bg-[#e2e6ec]" />
              <div>
                <div className="mb-1 text-[11.5px] text-[#69748a]">Issue To (จ่ายไปที่)</div>
                <select
                  value={issueTo}
                  onChange={(e) => setIssueTo(e.target.value)}
                  className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
                >
                  {ISSUE_TO_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {issueType === "EXTERNAL" && (
            <>
              <div className="h-[34px] w-px bg-[#e2e6ec]" />
              <div>
                <div className="mb-1 text-[11.5px] text-[#69748a]">Customer / ลูกค้า (Ship-to)</div>
                <div className="w-[210px]">
                  <SearchableSelect
                    value={
                      selectedCustomer
                        ? `${selectedCustomer.code ? selectedCustomer.code + " · " : ""}${selectedCustomer.name}`
                        : "เลือกลูกค้า…"
                    }
                    options={[
                      { value: "", label: "เลือกลูกค้า…" },
                      ...customers.map((c) => ({
                        value: c.id,
                        label: `${c.code ? c.code + " · " : ""}${c.name}`,
                      })),
                    ]}
                    onSelect={selectCustomer}
                    placeholder="พิมพ์ค้นหาลูกค้า…"
                    className="w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#e5913a]"
                  />
                </div>
              </div>
            </>
          )}
          {issueType === "EXTERNAL" && selectedCustomer && (
            <div>
              <div className="mb-1 text-[11.5px] text-[#69748a]">Ship-to (ที่อยู่จัดส่ง)</div>
              {shipTos.length > 0 ? (
                <select
                  value={shipToId}
                  onChange={(e) => setShipToId(e.target.value)}
                  className="max-w-[220px] rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
                >
                  {shipTos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                      {s.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="pt-1.5 text-[12px] text-[#c2606f]">
                  ยังไม่มีที่อยู่ — เพิ่มในหน้า Customers
                </div>
              )}
              {selectedShipTo && (
                <div className="mt-1 max-w-[240px] text-[11px] leading-snug text-[#69748a]">
                  {selectedShipTo.address}
                </div>
              )}
            </div>
          )}
          <div className="h-[34px] w-px bg-[#e2e6ec]" />
          <div>
            <div className="mb-1 text-[11.5px] text-[#69748a]">Material Document (SAP)</div>
            <input
              value={materialDoc}
              onChange={(e) => setMaterialDoc(e.target.value)}
              placeholder="เลขที่จาก SAP"
              className="font-num w-[140px] rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div className="min-w-[150px] flex-1">
            <div className="mb-1 text-[11.5px] text-[#69748a]">Remark (หมายเหตุ)</div>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม"
              className="w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px]"
            />
          </div>
          {lastConfirmed && (
            <button onClick={handlePrint} className={buttonClass("secondary")}>
              ⎙ Print last ({lastConfirmed.docNo})
            </button>
          )}
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

        <div className="border-b border-[#eef1f5] bg-[#eef6f9] p-[10px_22px] text-[12px] text-[#3a4658]">
          Default lot is auto-FEFO (earliest expiry). Change the Lot dropdown to issue a specific lot instead.
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[10px_16px] text-[11.5px] font-medium">SAP Material Master</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Material Description</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Lot</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Location</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Expiry</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">On Hand</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">Issue Qty</th>
                <th className="w-10 p-[10px_16px]"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const sel = l.lots.find((x) => x.id === l.selectedLotId);
                const isFefo = !!sel?.isFefo;
                return (
                  <tr
                    key={i}
                    className="border-t border-[#eef1f5]"
                    style={{ background: isFefo ? "#f2fafc" : "#fdf7ee" }}
                  >
                    <td className="font-num p-[11px_16px] text-[12px] text-[#3a4658]">{l.code}</td>
                    <td className="p-[11px_16px] font-medium">{l.name}</td>
                    <td className="p-[11px_16px]">
                      <select
                        value={l.selectedLotId}
                        onChange={(e) => updateLine(i, { selectedLotId: e.target.value })}
                        className="font-num rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-[12px]"
                      >
                        {l.lots.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.lotNo} · {lot.locationCode} ·{" "}
                            {lot.expDate ? fmtDateBE(new Date(lot.expDate)) : "no exp"}
                            {lot.isFefo ? " ★FEFO" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="mt-0.5">
                        {isFefo ? (
                          <span className="rounded-full bg-[#fbeff0] px-2 py-0.5 text-[10px] font-semibold text-[#b0141f]">
                            FEFO
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#fdf0e2] px-2 py-0.5 text-[10px] font-semibold text-[#bd6f12]">
                            manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-num p-[11px_16px] text-[12px]">{sel?.locationCode}</td>
                    <td className="font-num p-[11px_16px] text-[12px] text-[#69748a]">
                      {sel?.expDate ? fmtDateBE(new Date(sel.expDate)) : "—"}
                    </td>
                    <td className="font-num p-[11px_16px] text-right">{sel?.qty.toLocaleString()}</td>
                    <td className="p-[11px_16px] text-right">
                      <input
                        value={l.qty}
                        onChange={(e) => updateLine(i, { qty: e.target.value })}
                        className="font-num w-[84px] rounded-[7px] border border-[#d7dce4] px-2 py-1.5 text-right text-[13px]"
                      />
                    </td>
                    <td className="p-[11px_16px] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => splitLine(i)}
                          title="จ่ายอีก Lot ของสินค้าตัวนี้ (issue from another lot)"
                          className="rounded-[6px] border border-[#f0d6b3] bg-[#fdf3e5] px-1.5 py-0.5 text-[11px] font-semibold text-[#bd6f12] hover:bg-[#fbe9d2]"
                        >
                          ＋Lot
                        </button>
                        <button onClick={() => removeLine(i)} className="text-[16px] text-[#c2606f]">
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#9aa4b4]">
                    No lines yet — add a product below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 border-t border-[#eef1f5] p-[12px_16px]">
          <SearchableSelect
            options={available.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
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
            {lines.length} lines · total qty <b className="font-num text-[#16202e]">{totalQty.toLocaleString()}</b> ·
            total value <b className="font-num text-[#16202e]">฿{totalValue.toLocaleString()}</b>
          </div>
          <div className="flex-1" />
          <button onClick={handleDraft} className={buttonClass("secondary")}>
            Save draft (ร่าง)
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || lines.length === 0}
            className={buttonClass("primary", "!bg-[#e5913a]")}
          >
            {saving ? "Saving…" : "Confirm issue (ยืนยันจ่าย)"}
          </button>
        </div>
      </div>

      {popup && (
        <CuteBoxPopup open kind={popup.kind} message={popup.message} onClose={() => setPopup(null)} />
      )}
    </>
  );
}
