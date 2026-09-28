"use client";
import { useState } from "react";
import { Modal, ModalHeader } from "./Modal";
import { showToast } from "./Toast";
import { updateReceiptLineAction } from "@/lib/actions/receive";

export type EditableReceiptLine = {
  id: string;
  productCode: string;
  recvQty: number;
  lotNo: string;
  locationCode: string;
  mfgDate: string; // yyyy-mm-dd or ""
  expDate: string;
};

const field = "rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#e41e2b]";

/** Correct one line of a posted receipt (product / lot / location / qty / dates).
 *  Stock is re-booked to match. */
export function EditReceiptLineModal({
  line,
  products,
  locations,
  onClose,
  onSaved,
}: {
  line: EditableReceiptLine;
  products: { code: string; name: string }[];
  locations: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productCode, setProductCode] = useState(line.productCode);
  const [qty, setQty] = useState(String(line.recvQty));
  const [lotNo, setLotNo] = useState(line.lotNo);
  const [loc, setLoc] = useState(line.locationCode);
  const [mfg, setMfg] = useState(line.mfgDate);
  const [exp, setExp] = useState(line.expDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await updateReceiptLineAction(line.id, {
      productCode,
      recvQty: Number(qty),
      lotNo,
      locationCode: loc,
      mfgDate: mfg || null,
      expDate: exp || null,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    showToast("แก้ไขรายการแล้ว (line updated)");
    onSaved();
  }

  // Keep the current location/product selectable even if it isn't in the option list.
  const locOpts = locations.includes(loc) ? locations : [loc, ...locations];
  const prodHasCurrent = products.some((p) => p.code === productCode);

  return (
    <Modal open onClose={onClose} width={440}>
      <ModalHeader title="แก้ไขรายการ (Edit line)" onClose={onClose} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[#8a92a8]">สินค้า (Product)</span>
          <select value={productCode} onChange={(e) => setProductCode(e.target.value)} className={field}>
            {!prodHasCurrent && <option value={productCode}>{productCode}</option>}
            {products.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#8a92a8]">จำนวน (Qty)</span>
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className={`font-num ${field}`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#8a92a8]">ที่เก็บ (Location)</span>
            <select value={loc} onChange={(e) => setLoc(e.target.value)} className={field}>
              {locOpts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[#8a92a8]">Lot</span>
          <input value={lotNo} onChange={(e) => setLotNo(e.target.value)} className={`font-num ${field}`} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#8a92a8]">วันผลิต (Mfg)</span>
            <input type="date" value={mfg} onChange={(e) => setMfg(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#8a92a8]">วันหมดอายุ (Expiry)</span>
            <input type="date" value={exp} onChange={(e) => setExp(e.target.value)} className={field} />
          </label>
        </div>

        <p className="rounded-[8px] bg-[#f7f9fb] p-2.5 text-[11px] leading-relaxed text-[#69748a]">
          ระบบจะย้ายสต็อกของบรรทัดนี้ไปตามค่าที่แก้ให้อัตโนมัติ ·
          แก้ไม่ได้ถ้าของถูกย้าย/เบิกไปแล้ว
        </p>

        {error && <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12px] text-[#c53f3f]">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="rounded-[8px] border border-[#d7dce4] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#69748a] hover:bg-[#f7f9fb] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="rounded-[8px] bg-[#e41e2b] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#a8121c] disabled:opacity-50">
            {saving ? "กำลังบันทึก…" : "บันทึก · Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
