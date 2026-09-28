"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "./Card";
import { Modal, ModalHeader } from "./Modal";
import { buttonClass } from "./Button";
import { showToast } from "./Toast";
import { fmtDateBE, fmtDateISO } from "@/lib/calc/date";
import { reverseDocumentAction, deleteDocumentAction, ReversibleKind } from "@/lib/actions/reverse";
import { updateDocMetaAction, MetaEditableKind } from "@/lib/actions/docMeta";
import { getRedoTemplateAction } from "@/lib/actions/redo";
import { stashRedo } from "@/lib/redoTemplate";
import { printTable, printCountSheet } from "@/lib/calc/printClient";
import { EditReceiptLineModal, EditableReceiptLine } from "./EditReceiptLineModal";

export type DocHistoryLine = {
  code: string;
  name: string;
  qtyText: string;
  extra?: string;
  // Optional structured fields — used when printing as a WEEKLY CYCLE COUNT sheet.
  lotNo?: string;
  location?: string;
  sysText?: string;
  countText?: string;
  // Raw fields for in-place line editing (receipts only). Present → an "edit"
  // button shows on the line in the document modal.
  edit?: EditableReceiptLine;
};

export type DocHistoryRow = {
  id: string;
  docNo: string;
  docDate: string;
  summary: string;
  lineCount: number;
  lines: DocHistoryLine[];
  reversedAt?: string | null;
  // Editable SAP metadata (receipts & issues only).
  materialDoc?: string;
  remark?: string;
};



function printDoc(title: string, row: DocHistoryRow, sheet?: "count") {
  if (sheet === "count") {
    // Print the completed count as the WEEKLY CYCLE COUNT form (values filled in).
    printCountSheet({
      meta: [`${row.docNo}`, `Date: ${fmtDateBE(new Date(row.docDate))}`, row.summary],
      showSys: true,
      rows: row.lines.map((l) => [
        l.code,
        l.name,
        l.lotNo ?? "",
        l.location ?? "",
        l.sysText ?? "",
        l.countText ?? l.qtyText,
      ]),
    });
    return;
  }
  printTable({
    title: `${title} — ${row.docNo}`,
    meta: [`Date: ${fmtDateBE(new Date(row.docDate))}`, row.summary],
    headers: ["SAP Material Master", "Material Description", "Qty", "Lot / Location"],
    rows: row.lines.map((l) => [l.code, l.name, l.qtyText, l.extra ?? ""]),
  });
}

export function DocHistory({
  title,
  rows,
  accentColor = "#e41e2b",
  reverseKind,
  printSheet,
  productOptions,
  locationOptions,
}: {
  title: string;
  rows: DocHistoryRow[];
  accentColor?: string;
  reverseKind?: ReversibleKind;
  printSheet?: "count";
  // Supplying these turns on per-line editing for receipts (product/lot/qty/loc).
  productOptions?: { code: string; name: string }[];
  locationOptions?: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<DocHistoryRow | null>(null);
  const [editingLine, setEditingLine] = useState<EditableReceiptLine | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  // SAP metadata editing (receipts & issues)
  const [matDoc, setMatDoc] = useState("");
  const [remark, setRemark] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  // Delete
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEditMeta = reverseKind === "receipt" || reverseKind === "issue";
  const canEditLines =
    reverseKind === "receipt" && !!productOptions && !!locationOptions && !selected?.reversedAt;

  function openRow(r: DocHistoryRow) {
    setSelected(r);
    setConfirming(false);
    setDeleteConfirming(false);
    setReverseError(null);
    setMetaError(null);
    setMatDoc(r.materialDoc ?? "");
    setRemark(r.remark ?? "");
  }

  function closeModal() {
    setSelected(null);
    setConfirming(false);
    setDeleteConfirming(false);
    setReverseError(null);
    setMetaError(null);
  }

  async function handleReverse() {
    if (!selected || !reverseKind) return;
    setReversing(true);
    setReverseError(null);
    try {
      const res = await reverseDocumentAction(reverseKind, selected.id);
      if (res.error) {
        setReverseError(res.error);
        return;
      }
      showToast(`Document ${selected.docNo} reversed (ถอยเอกสารแล้ว)`);
      closeModal();
      router.refresh();
    } catch (e) {
      setReverseError(e instanceof Error ? e.message : "Failed to reverse document.");
    } finally {
      setReversing(false);
    }
  }

  async function handleDelete() {
    if (!selected || !reverseKind) return;
    setDeleting(true);
    setReverseError(null);
    try {
      const res = await deleteDocumentAction(reverseKind, selected.id);
      if (res.error) {
        setReverseError(res.error);
        return;
      }
      showToast(`Document ${selected.docNo} deleted (ลบเอกสารแล้ว)`);
      closeModal();
      router.refresh();
    } catch (e) {
      setReverseError(e instanceof Error ? e.message : "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveMeta() {
    if (!selected || !canEditMeta) return;
    setSavingMeta(true);
    setMetaError(null);
    try {
      const res = await updateDocMetaAction(reverseKind as MetaEditableKind, selected.id, {
        materialDoc: matDoc,
        remark,
      });
      if (res.error) {
        setMetaError(res.error);
        return;
      }
      showToast(`บันทึกแล้ว · saved (${selected.docNo})`);
      // Reflect saved values on the open row so it stays consistent.
      setSelected({ ...selected, materialDoc: matDoc.trim(), remark: remark.trim() });
      router.refresh();
    } catch (e) {
      setMetaError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleRedo() {
    if (!selected || !reverseKind) return;
    setReversing(true);
    setReverseError(null);
    const res = await getRedoTemplateAction(reverseKind, selected.id);
    setReversing(false);
    if ("error" in res) {
      setReverseError(res.error);
      return;
    }
    stashRedo(reverseKind, res.payload);
    closeModal();
    router.push(res.path);
  }

  const visibleRows = filterDate
    ? rows.filter((r) => fmtDateISO(new Date(r.docDate)) === filterDate)
    : rows;

  const metaDirty =
    !!selected &&
    (matDoc.trim() !== (selected.materialDoc ?? "").trim() ||
      remark.trim() !== (selected.remark ?? "").trim());

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle>{title}</CardTitle>
        <div className="flex-1" />
        <span className="text-[11.5px] text-[#9aa4b4]">ค้นหาวันที่:</span>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="font-num rounded-[7px] border border-[#d7dce4] px-2 py-1 text-[12px] outline-none focus:border-[#e41e2b]"
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="rounded-[7px] border border-[#d7dce4] bg-white px-2 py-1 text-[11.5px] text-[#69748a] hover:bg-[#f7f9fb]"
          >
            ล้าง
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="p-4 text-center text-[12.5px] text-[#9aa4b4]">
          No documents yet
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="p-4 text-center text-[12.5px] text-[#9aa4b4]">
          ไม่พบเอกสารของวันที่เลือก (no documents on this date)
        </div>
      ) : (
        <div className="flex flex-col">
          {visibleRows.map((r) => (
            <button
              key={r.id}
              onClick={() => openRow(r)}
              className="flex items-center gap-3 border-t border-[#eef1f5] py-2.5 text-left text-[13px] first:border-t-0 hover:bg-[#f7f9fb]"
            >
              <span
                className="font-num w-[130px] flex-none font-semibold"
                style={{ color: accentColor }}
              >
                {r.docNo}
              </span>
              <span className="font-num w-[92px] flex-none text-[#69748a]">
                {fmtDateBE(new Date(r.docDate))}
              </span>
              <span className="flex-1 truncate text-[#3a4658]">
                {r.summary}
                {r.reversedAt && (
                  <span className="ml-2 rounded-[5px] bg-[#f3d2d2] px-1.5 py-0.5 text-[10px] font-semibold text-[#b13c3c]">
                    ถอยแล้ว · Reversed
                  </span>
                )}
              </span>
              <span className="font-num text-[11.5px] text-[#9aa4b4]">
                {r.lineCount} lines
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={closeModal} width={560}>
        {selected && (
          <>
            <ModalHeader
              title={
                <span>
                  <span className="font-num">{selected.docNo}</span> ·{" "}
                  {fmtDateBE(new Date(selected.docDate))}
                  {selected.reversedAt && (
                    <span className="ml-2 rounded-[5px] bg-[#f3d2d2] px-1.5 py-0.5 text-[10px] font-semibold text-[#b13c3c]">
                      ถอยแล้ว · Reversed
                    </span>
                  )}
                </span>
              }
              action={
                <button
                  onClick={() => printDoc(title, selected, printSheet)}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#3a4658] hover:bg-[#f7f9fb]"
                >
                  ⎙ Print
                </button>
              }
              onClose={closeModal}
            />
            <div className="max-h-[420px] overflow-auto px-5 py-4">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9aa4b4]">
                    <th className="w-[80px] pb-2 pr-3 font-medium">SAP Material Master</th>
                    <th className="pb-2 pr-3 font-medium">Material Description</th>
                    <th className="pb-2 pr-3 text-right font-medium">Qty</th>
                    <th className="pb-2 pl-3 font-medium">Lot / Location</th>
                    {canEditLines && <th className="pb-2 pl-3 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l, i) => (
                    <tr key={i} className="border-t border-[#eef1f5]">
                      <td className="font-num py-2 pr-3 text-[#3a4658]">{l.code}</td>
                      <td className="py-2 pr-3 font-medium">{l.name}</td>
                      <td className="font-num py-2 pr-3 text-right">{l.qtyText}</td>
                      <td className="border-l border-[#eef1f5] py-2 pl-3 text-[11.5px] text-[#9aa4b4]">
                        {l.extra}
                      </td>
                      {canEditLines && (
                        <td className="py-2 pl-3 text-right">
                          {l.edit && (
                            <button
                              onClick={() => setEditingLine(l.edit!)}
                              className="rounded-[7px] border border-[#d7dce4] bg-white px-2 py-1 text-[11.5px] font-medium text-[#e41e2b] hover:bg-[#f0f6fc]"
                            >
                              ✎ แก้ไข
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {canEditMeta && (
                <div className="mt-4 rounded-[10px] border border-[#e7ebf1] bg-[#fafbfc] p-3">
                  <div className="mb-2 text-[11.5px] font-semibold text-[#69748a]">
                    เพิ่ม/แก้ไขภายหลัง · Material Document (SAP) &amp; Remark
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[#8a92a8]">
                        Material Document (เลขจาก SAP)
                      </span>
                      <input
                        value={matDoc}
                        onChange={(e) => setMatDoc(e.target.value)}
                        placeholder="เช่น 4900012345"
                        className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#e41e2b]"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-[#8a92a8]">Remark (หมายเหตุ)</span>
                      <input
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="หมายเหตุเพิ่มเติม"
                        className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#e41e2b]"
                      />
                    </label>
                    {metaError && (
                      <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12px] text-[#c53f3f]">
                        {metaError}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveMeta}
                        disabled={savingMeta || !metaDirty}
                        className="rounded-[8px] bg-[#e41e2b] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#a8121c] disabled:opacity-50"
                      >
                        {savingMeta ? "กำลังบันทึก…" : "บันทึก · Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {reverseKind && !selected.reversedAt && (
              <div className="border-t border-[#eef1f5] bg-[#fafbfc] px-5 py-3">
                {reverseError && (
                  <div className="mb-2 rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12px] text-[#c53f3f]">
                    {reverseError}
                  </div>
                )}
                {!confirming ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-[#69748a]">
                      ถอยเอกสารนี้ = คืนสต็อกกลับ (undo this document&apos;s stock effect)
                    </span>
                    <button
                      onClick={() => setConfirming(true)}
                      className="flex-none rounded-[8px] border border-[#e2b4b4] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#c0453f] hover:bg-[#fbe9e9]"
                    >
                      ↩ ถอยเอกสาร (Reverse)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-medium text-[#3a4658]">
                      ยืนยันถอยเอกสาร {selected.docNo}? สต็อกจะถูกคืนกลับ
                    </span>
                    <div className="flex flex-none gap-2">
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={reversing}
                        className={buttonClass("secondary")}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReverse}
                        disabled={reversing}
                        className="rounded-[8px] bg-[#c0453f] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#a83b36] disabled:opacity-60"
                      >
                        {reversing ? "กำลังถอย…" : "ยืนยันถอย"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reverseKind && selected.reversedAt && (
              <div className="border-t border-[#eef1f5] bg-[#fafbfc] px-5 py-3">
                {reverseError && (
                  <div className="mb-2 rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12px] text-[#c53f3f]">
                    {reverseError}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-[#69748a]">
                    ทำเอกสารนี้อีกครั้ง — เอาข้อมูลไปกรอกใหม่ (re-enter as a new document)
                  </span>
                  <button
                    onClick={handleRedo}
                    disabled={reversing}
                    className="flex-none rounded-[8px] border border-[#bfe0cd] bg-[#fdeced] px-3 py-1.5 text-[12.5px] font-semibold text-[#b0141f] hover:bg-[#d6eef4] disabled:opacity-60"
                  >
                    {reversing ? "กำลังเตรียม…" : "↻ ทำซ้ำ (Redo)"}
                  </button>
                </div>
              </div>
            )}

            {reverseKind && (
              <div className="border-t border-[#eef1f5] bg-[#fdf5f5] px-5 py-3">
                {!deleteConfirming ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-[#a06a6a]">
                      ลบเอกสารถาวร — {selected.reversedAt ? "ลบออกจากประวัติ" : "คืนสต็อกกลับแล้วลบทิ้ง"}{" "}
                      (delete permanently)
                    </span>
                    <button
                      onClick={() => setDeleteConfirming(true)}
                      className="flex-none rounded-[8px] border border-[#e2b4b4] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#c0453f] hover:bg-[#fbe9e9]"
                    >
                      🗑 ลบเอกสาร (Delete)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-medium text-[#3a4658]">
                      ยืนยันลบเอกสาร {selected.docNo}? ลบแล้วกู้คืนไม่ได้
                      {!selected.reversedAt && " · สต็อกจะถูกคืนกลับก่อนลบ"}
                    </span>
                    <div className="flex flex-none gap-2">
                      <button
                        onClick={() => setDeleteConfirming(false)}
                        disabled={deleting}
                        className={buttonClass("secondary")}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-[8px] bg-[#c0453f] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#a83b36] disabled:opacity-60"
                      >
                        {deleting ? "กำลังลบ…" : "ยืนยันลบ"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      {editingLine && productOptions && locationOptions && (
        <EditReceiptLineModal
          line={editingLine}
          products={productOptions}
          locations={locationOptions}
          onClose={() => setEditingLine(null)}
          onSaved={() => {
            setEditingLine(null);
            closeModal();
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
