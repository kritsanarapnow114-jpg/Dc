"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShipRow, ShipCustomer, ShipProduct } from "@/lib/views/ship";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Currency";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { buttonClass } from "@/components/ui/Button";
import { Tone } from "@/components/ui/tone";
import { fmtDateBE, fmtDateISO } from "@/lib/calc/date";
import { showToast } from "@/components/ui/Toast";
import {
  deleteShipOrderAction,
  addShipLinesAction,
  updateShipOrderAction,
  updateShipLineQtysAction,
  fulfillShipOrderAction,
} from "@/lib/actions/ship";

const STATUS_TONE: Record<ShipRow["status"], Tone> = {
  COMPLETE: "ok",
  PENDING: "warn",
  OPEN: "accent",
};

const STATUS_LABEL: Record<ShipRow["status"], string> = {
  COMPLETE: "ส่งครบแล้ว (Complete)",
  PENDING: "ส่งบางส่วน (Partial)",
  OPEN: "รอจัดส่ง (Open)",
};

export function ShipTable({
  rows,
  customers,
  products = [],
}: {
  rows: ShipRow[];
  customers: ShipCustomer[];
  products?: ShipProduct[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ShipRow | null>(null);
  const [newLines, setNewLines] = useState<{ productCode: string; name: string; ordered: string }[]>([]);
  const [savingLines, setSavingLines] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editShipToId, setEditShipToId] = useState("");
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editShipDate, setEditShipDate] = useState("");
  const [editTracking, setEditTracking] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editQtys, setEditQtys] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [shipQtys, setShipQtys] = useState<Record<string, string>>({});
  const [shipDate, setShipDate] = useState(fmtDateISO(new Date()));
  const [shipTracking, setShipTracking] = useState("");
  const [shipping, setShipping] = useState(false);

  const editCustomer = selected ? customers.find((c) => c.id === selected.customerId) : undefined;

  function openDetail(so: ShipRow) {
    setSelected(so);
    setEditing(false);
    setNewLines([]);
    setEditShipToId(so.shipToId ?? "");
    setEditOrderDate(fmtDateISO(new Date(so.orderDate)));
    setEditShipDate(so.requestedShipDate ? fmtDateISO(new Date(so.requestedShipDate)) : "");
    setEditTracking(so.tracking);
    setEditRemark(so.remark);
    setEditQtys(Object.fromEntries(so.lines.map((l) => [l.id, String(l.ordered)])));
    setShipQtys(Object.fromEntries(so.lines.map((l) => [l.id, String(l.remaining)])));
    setShipDate(fmtDateISO(new Date()));
    setShipTracking("");
  }

  function closeDetail() {
    setSelected(null);
    setNewLines([]);
    setEditing(false);
  }

  async function saveEdit() {
    if (!selected) return;
    setSavingEdit(true);
    const res = await updateShipOrderAction(selected.id, {
      shipToId: editShipToId || null,
      orderDate: editOrderDate,
      requestedShipDate: editShipDate || null,
      tracking: editTracking,
      remark: editRemark,
    });
    if (!res.error && selected.status === "OPEN") {
      await updateShipLineQtysAction(
        selected.id,
        selected.lines.map((l) => ({ lineId: l.id, ordered: Number(editQtys[l.id]) || 0 }))
      );
    }
    setSavingEdit(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast(`Updated ${selected.no}`);
    setEditing(false);
    closeDetail();
    router.refresh();
  }

  function addDraftLine(code: string) {
    const p = products.find((x) => x.code === code);
    if (!p) return;
    if (newLines.some((l) => l.productCode === code)) return;
    setNewLines((ls) => [...ls, { productCode: p.code, name: p.name, ordered: "0" }]);
  }

  async function saveNewLines() {
    if (!selected) return;
    setSavingLines(true);
    const res = await addShipLinesAction(
      selected.id,
      newLines.map((l) => ({ productCode: l.productCode, ordered: Number(l.ordered) || 0 }))
    );
    setSavingLines(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast(`Lines added to ${selected.no}`);
    setNewLines([]);
    closeDetail();
    router.refresh();
  }

  async function confirmShipment() {
    if (!selected) return;
    const lines = selected.lines
      .map((l) => ({ lineId: l.id, qty: Number(shipQtys[l.id]) || 0 }))
      .filter((l) => l.qty > 0);
    if (lines.length === 0) {
      showToast("กรอกจำนวนที่จะจัดส่ง (enter a qty to ship)");
      return;
    }
    setShipping(true);
    const res = await fulfillShipOrderAction({
      soId: selected.id,
      docDate: shipDate,
      tracking: shipTracking || null,
      lines,
    });
    setShipping(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast(`Shipped — issue ${res.docNo} posted, stock deducted`);
    closeDetail();
    router.refresh();
  }

  const remainingTotal = selected?.lines.reduce((s, l) => s + l.remaining, 0) ?? 0;

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <table className="w-full min-w-[880px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
              <Th>Order No.</Th>
              <Th>Customer</Th>
              <Th>Order date</Th>
              <Th>Ship by</Th>
              <Th align="right">Amount</Th>
              <Th>Shipped</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((so) => (
              <tr
                key={so.id}
                onClick={() => openDetail(so)}
                className="cursor-pointer border-t border-[#eef1f5] hover:bg-[#f7f9fb]"
              >
                <Td className="font-num text-[12px] text-[#3a4658]">{so.no}</Td>
                <Td className="font-medium">
                  {so.customerName}
                  {so.shipToLabel && (
                    <span className="ml-1 text-[11px] font-normal text-[#9aa4b4]">· {so.shipToLabel}</span>
                  )}
                </Td>
                <Td className="font-num text-[12px] text-[#69748a]">
                  {fmtDateBE(new Date(so.orderDate))}
                </Td>
                <Td className="font-num text-[12px] text-[#69748a]">
                  {so.requestedShipDate ? fmtDateBE(new Date(so.requestedShipDate)) : "—"}
                </Td>
                <Td align="right" className="font-num font-semibold">
                  <Money value={so.amount} />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-[110px]">
                      <ProgressBar pct={so.shippedPct} />
                    </div>
                    <span className="font-num w-[38px] text-[12px] text-[#69748a]">
                      {Math.round(so.shippedPct)}%
                    </span>
                  </div>
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[so.status]}>{STATUS_LABEL[so.status]}</Badge>
                </Td>
                <Td align="center">
                  <button
                    title="Delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete ${so.no}? (ลบออเดอร์นี้?)`)) return;
                      const res = await deleteShipOrderAction(so.id);
                      if (res.error) showToast(res.error);
                      else {
                        showToast(`Deleted ${so.no}`);
                        router.refresh();
                      }
                    }}
                    className="cursor-pointer border-0 bg-transparent text-[15px] text-[#c2606f]"
                  >
                    🗑
                  </button>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[#9aa4b4]">
                  No ship orders found (ไม่พบออเดอร์จัดส่ง)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={closeDetail} width={680}>
        {selected && (
          <>
            <ModalHeader
              title={
                <span>
                  <span className="font-num">{selected.no}</span>{" "}
                  <span className="font-normal text-[#69748a]">· {selected.customerName}</span>
                </span>
              }
              action={
                !editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#3a4658] hover:bg-[#f7f9fb]"
                  >
                    ✎ Edit
                  </button>
                ) : undefined
              }
              onClose={closeDetail}
            />
            <div className="p-5">
              {editing ? (
                <div className="mb-4 rounded-[10px] border border-[#e7ebf1] bg-[#fafbfc] p-3">
                  <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#69748a]">
                    Edit ship order (แก้ไขออเดอร์)
                  </div>
                  {selected.status === "OPEN" ? (
                    <div className="mb-2 text-[11px] text-[#9aa4b4]">
                      แก้จำนวนสั่งในตารางด้านล่างได้ · ใส่ 0 เพื่อลบรายการ (edit qty below; 0 removes)
                    </div>
                  ) : (
                    <div className="mb-2 text-[11px] text-[#bd6f12]">
                      จัดส่งไปแล้วบางส่วน — แก้ได้เฉพาะที่อยู่/วันที่/tracking (quantities locked once shipped)
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-medium text-[#69748a]">Ship-to (ที่อยู่จัดส่ง)</span>
                      <select
                        value={editShipToId}
                        onChange={(e) => setEditShipToId(e.target.value)}
                        className="rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                      >
                        <option value="">—</option>
                        {(editCustomer?.shipTos ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                            {s.isDefault ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-medium text-[#69748a]">Order date (วันสั่ง)</span>
                      <input
                        type="date"
                        value={editOrderDate}
                        onChange={(e) => setEditOrderDate(e.target.value)}
                        className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-medium text-[#69748a]">Ship by (วันนัดส่ง)</span>
                      <input
                        type="date"
                        value={editShipDate}
                        onChange={(e) => setEditShipDate(e.target.value)}
                        className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-medium text-[#69748a]">Tracking / carrier</span>
                      <input
                        value={editTracking}
                        onChange={(e) => setEditTracking(e.target.value)}
                        className="rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex flex-col gap-1">
                    <span className="text-[11.5px] font-medium text-[#69748a]">Remark (หมายเหตุ)</span>
                    <input
                      value={editRemark}
                      onChange={(e) => setEditRemark(e.target.value)}
                      className="rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                    />
                  </label>
                  <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setEditing(false)} className={buttonClass("secondary")}>
                      Cancel
                    </button>
                    <button onClick={saveEdit} disabled={savingEdit} className={buttonClass("primary")}>
                      {savingEdit ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12.5px] text-[#69748a]">
                  <div>
                    Order:{" "}
                    <span className="font-num text-[#16202e]">{fmtDateBE(new Date(selected.orderDate))}</span>
                  </div>
                  <div>
                    Ship by:{" "}
                    <span className="font-num text-[#16202e]">
                      {selected.requestedShipDate ? fmtDateBE(new Date(selected.requestedShipDate)) : "—"}
                    </span>
                  </div>
                  <div>
                    Amount:{" "}
                    <span className="font-num font-semibold text-[#16202e]">
                      <Money value={selected.amount} />
                    </span>
                  </div>
                  <div>
                    Status: <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                  </div>
                  {selected.tracking && (
                    <div>
                      Tracking: <span className="font-num text-[#16202e]">{selected.tracking}</span>
                    </div>
                  )}
                  {selected.shipToAddress && (
                    <div className="w-full text-[11.5px] text-[#9aa4b4]">
                      Ship-to: {selected.shipToLabel ? selected.shipToLabel + " — " : ""}
                      {selected.shipToAddress}
                    </div>
                  )}
                </div>
              )}

              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9aa4b4]">
                    <th className="pb-2 font-medium">SAP Material Master</th>
                    <th className="pb-2 font-medium">Material Description</th>
                    <th className="pb-2 text-right font-medium">Ordered</th>
                    <th className="pb-2 text-right font-medium">Shipped</th>
                    <th className="pb-2 text-right font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.id} className="border-t border-[#eef1f5]">
                      <td className="font-num py-2">{l.productCode}</td>
                      <td className="py-2">{l.productName}</td>
                      <td className="font-num py-2 text-right">
                        {editing && selected.status === "OPEN" ? (
                          <input
                            value={editQtys[l.id] ?? ""}
                            onChange={(e) => setEditQtys((q) => ({ ...q, [l.id]: e.target.value }))}
                            type="number"
                            min="0"
                            className="font-num w-[90px] rounded-[6px] border border-[#d7dce4] px-2 py-1 text-right text-[12.5px]"
                          />
                        ) : (
                          `${l.ordered.toLocaleString()} ${l.unit}`
                        )}
                      </td>
                      <td className="font-num py-2 text-right">{l.shipped.toLocaleString()}</td>
                      <td className="font-num py-2 text-right">{l.remaining.toLocaleString()}</td>
                    </tr>
                  ))}
                  {selected.lines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-[#9aa4b4]">
                        No lines yet (ยังไม่มีรายการ)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Ship / fulfil panel — only while there is something left to ship. */}
              {selected.status !== "COMPLETE" && remainingTotal > 0 && (
                <div className="mt-4 rounded-[10px] border border-[#f0d6b3] bg-[#fdf7ee] p-3">
                  <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#bd6f12]">
                    Ship now (จัดส่ง) — deducts stock FEFO
                  </div>
                  <table className="mb-2 w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[#9aa4b4]">
                        <th className="pb-1.5 font-medium">Material Description</th>
                        <th className="pb-1.5 text-right font-medium">Remaining</th>
                        <th className="pb-1.5 text-right font-medium">Ship qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines
                        .filter((l) => l.remaining > 0)
                        .map((l) => (
                          <tr key={l.id} className="border-t border-[#f0e2cc]">
                            <td className="py-1.5">
                              <span className="font-num text-[11.5px] text-[#69748a]">{l.productCode}</span>{" "}
                              {l.productName}
                            </td>
                            <td className="font-num py-1.5 text-right text-[#69748a]">
                              {l.remaining.toLocaleString()} {l.unit}
                            </td>
                            <td className="py-1.5 text-right">
                              <input
                                value={shipQtys[l.id] ?? ""}
                                onChange={(e) =>
                                  setShipQtys((q) => ({ ...q, [l.id]: e.target.value }))
                                }
                                type="number"
                                min="0"
                                className="font-num w-[90px] rounded-[6px] border border-[#d7dce4] px-2 py-1 text-right text-[12.5px]"
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#69748a]">Ship date (วันที่ส่ง)</span>
                      <input
                        type="date"
                        value={shipDate}
                        onChange={(e) => setShipDate(e.target.value)}
                        className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-[11px] font-medium text-[#69748a]">Tracking (optional)</span>
                      <input
                        value={shipTracking}
                        onChange={(e) => setShipTracking(e.target.value)}
                        placeholder="เลขติดตาม/ขนส่ง"
                        className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                    <button
                      onClick={confirmShipment}
                      disabled={shipping}
                      className={buttonClass("primary", "!bg-[#e5913a]")}
                    >
                      {shipping ? "Shipping…" : "Confirm shipment (ยืนยันจัดส่ง)"}
                    </button>
                  </div>
                </div>
              )}

              {/* Add product lines — only before anything ships. */}
              {selected.status === "OPEN" && (
                <div className="mt-3 rounded-[10px] border border-[#e7ebf1] bg-[#fafbfc] p-3">
                  <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#69748a]">
                    Add product lines (เพิ่มรายการสินค้า)
                  </div>
                  {newLines.length > 0 && (
                    <table className="mb-2 w-full border-collapse text-[12.5px]">
                      <tbody>
                        {newLines.map((l, i) => (
                          <tr key={l.productCode} className="border-t border-[#eef1f5] first:border-t-0">
                            <td className="py-1.5">
                              <span className="font-num text-[11.5px] text-[#69748a]">{l.productCode}</span>{" "}
                              {l.name}
                            </td>
                            <td className="py-1.5 text-right">
                              <input
                                value={l.ordered}
                                onChange={(e) =>
                                  setNewLines((ls) =>
                                    ls.map((x, idx) => (idx === i ? { ...x, ordered: e.target.value } : x))
                                  )
                                }
                                className="font-num w-[90px] rounded-[6px] border border-[#d7dce4] px-2 py-1 text-right text-[12.5px]"
                              />
                            </td>
                            <td className="w-8 text-center">
                              <button
                                onClick={() => setNewLines((ls) => ls.filter((_, idx) => idx !== i))}
                                className="text-[15px] text-[#c2606f]"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <SearchableSelect
                        options={products
                          .filter(
                            (p) =>
                              !newLines.some((l) => l.productCode === p.code) &&
                              !selected.lines.some((l) => l.productCode === p.code)
                          )
                          .map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
                        onSelect={addDraftLine}
                        placeholder="+ เพิ่มสินค้า (พิมพ์ค้นหา)…"
                        className="w-full rounded-[7px] border border-dashed border-[#c4ccd8] bg-white px-2.5 py-1.5 text-[12.5px] text-[#3a4658] outline-none focus:border-[#2f86cf]"
                      />
                    </div>
                    {newLines.length > 0 && (
                      <button onClick={saveNewLines} disabled={savingLines} className={buttonClass("primary")}>
                        {savingLines ? "Saving…" : "Add to order"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-2 mt-5 text-[12.5px] font-semibold text-[#16202e]">
                Shipment history (ประวัติการจัดส่ง)
              </div>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9aa4b4]">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Issue No.</th>
                    <th className="pb-2 font-medium">SAP Material Master</th>
                    <th className="pb-2 font-medium">Material Description</th>
                    <th className="pb-2 font-medium">Lot</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.shipments.flatMap((sh) =>
                    sh.lines.map((l, i) => (
                      <tr key={`${sh.id}-${i}`} className="border-t border-[#eef1f5]">
                        <td className="font-num py-2">
                          {fmtDateBE(new Date(sh.shippedDate))}
                          {sh.reversed && <span className="ml-1 text-[10px] text-[#c2606f]">(reversed)</span>}
                        </td>
                        <td className="font-num py-2">{sh.docNo}</td>
                        <td className="font-num py-2">{l.productCode}</td>
                        <td className="py-2">{l.productName}</td>
                        <td className="font-num py-2">{l.lotNo}</td>
                        <td className="font-num py-2 text-right">
                          {l.qty.toLocaleString()} {l.unit}
                        </td>
                      </tr>
                    ))
                  )}
                  {selected.shipments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-[#9aa4b4]">
                        Not shipped yet (ยังไม่มีการจัดส่ง)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`p-[11px_9px] text-[11.5px] font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={`p-[12px_9px] ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      {children}
    </td>
  );
}
