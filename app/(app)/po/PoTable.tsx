"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PoRow } from "@/lib/views/po";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Currency";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { buttonClass } from "@/components/ui/Button";
import { Tone } from "@/components/ui/tone";
import { fmtDateBE } from "@/lib/calc/date";
import { deletePoAction, addPoLinesAction, updatePoAction, updatePoLineQtysAction } from "@/lib/actions/po";
import { fmtDateISO } from "@/lib/calc/date";
import { showToast } from "@/components/ui/Toast";

type PoProduct = { code: string; name: string };

const STATUS_TONE: Record<PoRow["status"], Tone> = {
  COMPLETE: "ok",
  PENDING: "warn",
  OPEN: "accent",
};

const STATUS_LABEL: Record<PoRow["status"], string> = {
  COMPLETE: "Complete (เสร็จสิ้น)",
  PENDING: "Pending (รอดำเนินการ)",
  OPEN: "Open (เปิด)",
};

export function PoTable({ rows, products = [] }: { rows: PoRow[]; products?: PoProduct[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<PoRow | null>(null);
  const [newLines, setNewLines] = useState<{ productCode: string; name: string; ordered: string }[]>([]);
  const [savingLines, setSavingLines] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVendor, setEditVendor] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editQtys, setEditQtys] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  function openDetail(po: PoRow) {
    setSelected(po);
    setEditing(false);
    setEditVendor(po.vendor);
    setEditDate(fmtDateISO(new Date(po.date)));
    setEditQtys(Object.fromEntries(po.lines.map((l) => [l.id, String(l.ordered)])));
  }

  function closeDetail() {
    setSelected(null);
    setNewLines([]);
    setEditing(false);
  }

  async function saveEdit() {
    if (!selected) return;
    setSavingEdit(true);
    const res = await updatePoAction(selected.id, { vendor: editVendor, date: editDate });
    if (!res.error) {
      await updatePoLineQtysAction(
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
    const res = await addPoLinesAction(
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

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
              <Th>PO No.</Th>
              <Th>Vendor</Th>
              <Th>Date</Th>
              <Th align="right">Amount</Th>
              <Th>Received</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((po) => (
              <tr
                key={po.id}
                onClick={() => openDetail(po)}
                className="cursor-pointer border-t border-[#eef1f5] hover:bg-[#f7f9fb]"
              >
                <Td className="font-num text-[12px] text-[#3a4658]">
                  {po.no}
                </Td>
                <Td className="font-medium">{po.vendor}</Td>
                <Td className="font-num text-[12px] text-[#69748a]">
                  {fmtDateBE(new Date(po.date))}
                </Td>
                <Td align="right" className="font-num font-semibold">
                  <Money value={po.amount} />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-[110px]">
                      <ProgressBar pct={po.receivedPct} />
                    </div>
                    <span className="font-num w-[38px] text-[12px] text-[#69748a]">
                      {Math.round(po.receivedPct)}%
                    </span>
                  </div>
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[po.status]}>
                    {STATUS_LABEL[po.status]}
                  </Badge>
                </Td>
                <Td align="center">
                  <button
                    title="Delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete ${po.no}? (ลบ PO นี้?)`)) return;
                      const res = await deletePoAction(po.id);
                      if (res.error) showToast(res.error);
                      else showToast(`Deleted ${po.no}`);
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
                <td colSpan={7} className="p-6 text-center text-[#9aa4b4]">
                  No purchase orders found (ไม่พบใบสั่งซื้อ)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={closeDetail} width={640}>
        {selected && (
          <>
            <ModalHeader
              title={
                <span>
                  <span className="font-num">{selected.no}</span>{" "}
                  <span className="text-[#69748a] font-normal">
                    · {selected.vendor}
                  </span>
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
                    Edit PO details (แก้ไขข้อมูล PO)
                  </div>
                  <div className="mb-2 text-[11px] text-[#9aa4b4]">
                    แก้จำนวนสั่งในตารางด้านล่างได้ · ใส่ 0 เพื่อลบรายการ (edit qty below; 0 removes the line)
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-medium text-[#69748a]">Vendor (ผู้ขาย)</span>
                      <input
                        value={editVendor}
                        onChange={(e) => setEditVendor(e.target.value)}
                        className="rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11.5px] font-medium text-[#69748a]">Doc date (วันที่)</span>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]"
                      />
                    </label>
                  </div>
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
                <div className="mb-4 flex items-center gap-6 text-[12.5px] text-[#69748a]">
                  <div>
                    Date:{" "}
                    <span className="font-num text-[#16202e]">
                      {fmtDateBE(new Date(selected.date))}
                    </span>
                  </div>
                  <div>
                    Amount:{" "}
                    <span className="font-num font-semibold text-[#16202e]">
                      <Money value={selected.amount} />
                    </span>
                  </div>
                  <div>
                    Status:{" "}
                    <Badge tone={STATUS_TONE[selected.status]}>
                      {STATUS_LABEL[selected.status]}
                    </Badge>
                  </div>
                </div>
              )}

              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9aa4b4]">
                    <th className="pb-2 font-medium">SAP Material Master</th>
                    <th className="pb-2 font-medium">Material Description</th>
                    <th className="pb-2 text-right font-medium">Ordered</th>
                    <th className="pb-2 text-right font-medium">Received</th>
                    <th className="pb-2 text-right font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.id} className="border-t border-[#eef1f5]">
                      <td className="font-num py-2">{l.productCode}</td>
                      <td className="py-2">{l.productName}</td>
                      <td className="font-num py-2 text-right">
                        {editing ? (
                          <input
                            value={editQtys[l.id] ?? ""}
                            onChange={(e) =>
                              setEditQtys((q) => ({ ...q, [l.id]: e.target.value }))
                            }
                            type="number"
                            min="0"
                            className="font-num w-[90px] rounded-[6px] border border-[#d7dce4] px-2 py-1 text-right text-[12.5px]"
                          />
                        ) : (
                          l.ordered.toLocaleString()
                        )}
                      </td>
                      <td className="font-num py-2 text-right">
                        {l.received.toLocaleString()}
                      </td>
                      <td className="font-num py-2 text-right">
                        {l.remaining.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {selected.lines.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-[#9aa4b4]"
                      >
                        No lines yet (ยังไม่มีรายการ)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Add more product lines to this PO */}
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
                      {savingLines ? "Saving…" : "Add to PO"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-2 mt-5 text-[12.5px] font-semibold text-[#16202e]">
                Receiving history (ประวัติการรับ)
              </div>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9aa4b4]">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Invoice</th>
                    <th className="pb-2 font-medium">SAP Material Master</th>
                    <th className="pb-2 font-medium">Material Description</th>
                    <th className="pb-2 font-medium">Lot</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.receipts.flatMap((r) =>
                    r.lines.map((l, i) => (
                      <tr key={`${r.id}-${i}`} className="border-t border-[#eef1f5]">
                        <td className="font-num py-2">{fmtDateBE(new Date(r.docDate))}</td>
                        <td className="font-num py-2">{r.invoiceNo ?? "—"}</td>
                        <td className="font-num py-2">{l.productCode}</td>
                        <td className="py-2">{l.productName}</td>
                        <td className="font-num py-2">{l.lotNo}</td>
                        <td className="font-num py-2 text-right">
                          {l.qty.toLocaleString()} {l.unit}
                        </td>
                      </tr>
                    ))
                  )}
                  {selected.receipts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-[#9aa4b4]">
                        Not received yet (ยังไม่มีการรับ)
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

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
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
