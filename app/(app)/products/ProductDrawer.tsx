"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Currency";
import { buttonClass } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import {
  getProductDetailAction,
  toggleLotQcAction,
  toggleAllLotsQcAction,
  updateLotAction,
} from "@/lib/actions/products";
import { ProductDetail } from "@/lib/views/products";
import { reorderStatus, REORDER_COLOR, REORDER_LABEL, effectiveLevels } from "@/lib/calc/reorder";
import { StockCardModal } from "./StockCardModal";
import { EditProductModal } from "./EditProductModal";
import Link from "next/link";

export function ProductDrawer({
  code,
  onClose,
}: {
  code: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [stockCardOpen, setStockCardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!code) return;
    getProductDetailAction(code).then((d) => {
      setDetail(d);
      setDetailCode(code);
    });
  }, [code]);

  // Only show fetched detail once it matches the currently-open code, so switching
  // products (or closing) never flashes the previous product's stale data.
  const shown = detailCode === code ? detail : null;

  async function refresh() {
    if (code) {
      const d = await getProductDetailAction(code);
      setDetail(d);
      setDetailCode(code);
    }
  }

  return (
    <Drawer open={!!code} onClose={onClose}>
      {shown && (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-[#eef1f5] px-5 py-4">
            <div className="flex-1">
              <div className="font-num text-[11px] text-[#9aa4b4]">
                {shown.code}
              </div>
              <div className="text-[15px] font-semibold text-[#16202e]">
                {shown.nameEnTh}
              </div>
            </div>
            <Badge tone={shown.status === "qc" ? "warn" : "ok"}>
              {shown.status === "qc" ? "QC Hold" : "Available"}
            </Badge>
            <button onClick={() => setEditOpen(true)} className={buttonClass("secondary")}>
              ✎ Edit
            </button>
            <button
              onClick={onClose}
              className="text-[18px] text-[#9aa4b4] hover:text-[#3a4658]"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <div className="rounded-[12px] border border-[#e7ebf1] p-3.5">
              <div className="mb-1.5 text-[11.5px] text-[#69748a]">
                On hand
              </div>
              <div className="font-num text-[19px] font-bold">
                {shown.onHand.toLocaleString()} {shown.unit}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#e7ebf1] p-3.5">
              <div className="mb-1.5 text-[11.5px] text-[#69748a]">
                Total value
              </div>
              <div className="font-num text-[19px] font-bold">
                <Money value={shown.totalValue} />
              </div>
            </div>
            <div className="col-span-2 rounded-[12px] border border-[#e7ebf1] p-3.5 text-[12px] text-[#69748a]">
              Pallet {shown.pallet.toLocaleString()} {shown.unit}/pallet ·
              Storage {shown.width}×{shown.length} m · stack ×
              {shown.stackLevels}
            </div>
            {(() => {
              const eff = effectiveLevels(shown.minQty, shown.maxQty, shown.autoMin, shown.autoMax);
              const rs = reorderStatus(shown.onHand, eff.min, eff.max);
              const c = REORDER_COLOR[rs];
              const isAuto = eff.minAuto || eff.maxAuto;
              return (
                <div className="col-span-2 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#e7ebf1] p-3.5 text-[12px] text-[#69748a]">
                  <span>
                    Min / Max:{" "}
                    <b className="font-num text-[#3a4658]">
                      {eff.min ? eff.min.toLocaleString() : "—"} / {eff.max ? eff.max.toLocaleString() : "—"} {shown.unit}
                    </b>
                    {isAuto && (
                      <span className="ml-1.5 rounded-[4px] bg-[#eef1f5] px-1 py-0.5 text-[10px] text-[#8a97a5]">
                        auto · คำนวณจากการใช้จริง
                      </span>
                    )}
                    {shown.autoSafety > 0 && (
                      <span className="ml-1.5">
                        · Safety stock ~{" "}
                        <b className="font-num text-[#3a4658]">
                          {shown.autoSafety.toLocaleString()} {shown.unit}
                        </b>
                      </span>
                    )}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: c.bg, color: c.text }}
                  >
                    {REORDER_LABEL[rs]}
                  </span>
                  <span className="flex-1" />
                  <button onClick={() => setEditOpen(true)} className="text-[11.5px] font-medium text-[#d71f28]">
                    กำหนดเอง →
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="flex-1 overflow-auto px-5">
            <div className="mb-2 text-[12.5px] font-semibold text-[#16202e]">
              Stored by Location / Lot
            </div>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="text-left text-[#9aa4b4]">
                  <th className="pb-2 font-medium">Loc</th>
                  <th className="pb-2 font-medium">Lot</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 font-medium">Mfg</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.lots.map((l) => (
                  <LotRow key={l.id} lot={l} onChanged={refresh} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 border-t border-[#eef1f5] p-4">
            <button
              onClick={() => setStockCardOpen(true)}
              className={buttonClass("secondary")}
            >
              ▤ Stock Card
            </button>
            <Link href="/adjust" className={buttonClass("secondary")}>
              Adjust
            </Link>
            <div className="flex-1" />
            <button
              onClick={async () => {
                await toggleAllLotsQcAction(shown.code);
                showToast("QC status updated");
                refresh();
              }}
              className={buttonClass(shown.status === "qc" ? "success" : "danger")}
              title="ทำกับทุกล็อตพร้อมกัน — ถ้าจะ Hold ทีละล็อต ใช้ปุ่ม Hold ในตารางด้านบน"
            >
              {shown.status === "qc" ? "Release ALL (คืนทั้งหมด)" : "Hold ALL lots (ทั้งหมด)"}
            </button>
          </div>

          <StockCardModal
            code={shown.code}
            name={shown.nameEnTh}
            open={stockCardOpen}
            onClose={() => setStockCardOpen(false)}
          />

          <EditProductModal
            product={shown}
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onSaved={refresh}
          />
        </div>
      )}
    </Drawer>
  );
}

type LotRowData = ProductDetail["lots"][number];

function fmtD(d: string | null): string {
  return d ? d.slice(0, 10) : "—";
}

/** One lot row: shows values with an explicit "✎ แก้ไข" button that opens a
 *  modal to edit the lot number, mfg date and expiry. QC hold toggle unchanged. */
function LotRow({ lot, onChanged }: { lot: LotRowData; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const expired = lot.expDate && new Date(lot.expDate) < new Date();
  const tone = expired ? "danger" : lot.status === "QC" ? "warn" : "ok";
  const label = expired ? "Expired" : lot.status === "QC" ? "QC" : "OK";

  return (
    <>
      <tr className="border-t border-[#eef1f5]">
        <td className="font-num py-2">{lot.locationCode}</td>
        <td className="font-num py-2">
          <span className="inline-flex items-center gap-1.5">
            {lot.lotNo}
            <button
              onClick={() => setEditing(true)}
              title="แก้ไขข้อมูลล็อต (เลข Lot / วันผลิต / วันหมดอายุ)"
              className="rounded-[6px] border border-[#d7dce4] bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-[#3a4658] hover:bg-[#f7f9fb]"
            >
              ✎ แก้ไข
            </button>
          </span>
        </td>
        <td className="font-num py-2 text-right">{lot.qty.toLocaleString()}</td>
        <td className="font-num py-2 text-[11.5px] text-[#69748a]">{fmtD(lot.mfgDate)}</td>
        <td className="font-num py-2 text-[11.5px] text-[#69748a]">{fmtD(lot.expDate)}</td>
        <td className="py-2">
          <div className="flex items-center gap-2">
            <Badge tone={tone}>{label}</Badge>
            <button
              onClick={async () => {
                // This row can stand for several stock records of the same lot —
                // hold/release them all together.
                for (const id of lot.ids) await toggleLotQcAction(id);
                showToast(lot.status === "QC" ? `Lot ${lot.lotNo} released` : `Lot ${lot.lotNo} held for QC`);
                onChanged();
              }}
              title={lot.status === "QC" ? "ปลด QC ล็อตนี้" : "Hold QC เฉพาะล็อตนี้"}
              className={`rounded-[6px] border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                lot.status === "QC"
                  ? "border-[#bfe0d3] bg-[#fbeff0] text-[#0e8ea6]"
                  : "border-[#f0cf9a] bg-[#fff2df] text-[#b5790f]"
              }`}
            >
              {lot.status === "QC" ? "▶ Release" : "⏸ Hold"}
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <LotEditModal
          lot={lot}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

/** Modal to edit a lot's number, manufacturing date and expiry. */
function LotEditModal({
  lot,
  onClose,
  onSaved,
}: {
  lot: LotRowData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lotNo, setLotNo] = useState(lot.lotNo);
  const [mfg, setMfg] = useState(lot.mfgDate ? lot.mfgDate.slice(0, 10) : "");
  const [exp, setExp] = useState(lot.expDate ? lot.expDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    // Apply the edit to every stock record this row represents (same lot+loc).
    let res: { error?: string; merged?: boolean } = {};
    let merged = false;
    for (const id of lot.ids) {
      res = await updateLotAction(id, { lotNo, mfgDate: mfg, expDate: exp });
      if (res.error) break;
      if (res.merged) merged = true;
    }
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    showToast(
      merged
        ? `รวมเข้ากับล็อต ${lotNo} เดิมแล้ว (merged into existing lot)`
        : `Lot ${lotNo} updated (แก้ไขล็อตแล้ว)`
    );
    onSaved();
  }

  return (
    <Modal open onClose={onClose} width={420}>
      <ModalHeader title={`แก้ไขล็อต (Edit lot) · ${lot.locationCode}`} onClose={onClose} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-medium text-[#69748a]">เลข/ชื่อ Lot (Lot number)</span>
          <input
            value={lotNo}
            onChange={(e) => setLotNo(e.target.value)}
            className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#d71f28]"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium text-[#69748a]">วันผลิต (Mfg)</span>
            <input
              type="date"
              value={mfg}
              onChange={(e) => setMfg(e.target.value)}
              className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#d71f28]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-medium text-[#69748a]">วันหมดอายุ (Expiry)</span>
            <input
              type="date"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              className="font-num rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#d71f28]"
            />
          </label>
        </div>
        <div className="text-[11px] text-[#9aa4b4]">
          * จำนวนคงเหลือแก้ที่หน้า Adjust (เพื่อเก็บประวัติการปรับ)
        </div>
        {error && (
          <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">{error}</div>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button onClick={onClose} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button disabled={saving} onClick={handleSave} className={buttonClass("primary")}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
