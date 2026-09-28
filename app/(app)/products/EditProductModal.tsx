"use client";

import { useState } from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { updateProductAction } from "@/lib/actions/products";
import { showToast } from "@/components/ui/Toast";
import { ProductDetail } from "@/lib/views/products";
import { Category } from "@prisma/client";
import { CONTAINER_TYPES, containerDef } from "@/lib/containerTypes";

export function EditProductModal({
  product,
  open,
  onClose,
  onSaved,
}: {
  product: ProductDetail;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nameEn, setNameEn] = useState(product.nameEn);
  const [nameTh, setNameTh] = useState(product.nameTh ?? "");
  const [category, setCategory] = useState(product.category as Category);
  const [unit, setUnit] = useState(product.unit);
  const [price, setPrice] = useState(String(product.price));
  const [pallet, setPallet] = useState(String(product.pallet));
  const [width, setWidth] = useState(String(product.width));
  const [length, setLength] = useState(String(product.length));
  const [stackLevels, setStackLevels] = useState(String(product.stackLevels));
  const [containerType, setContainerType] = useState(
    product.containerType && product.containerType !== "OTHER"
      ? containerDef(product.containerType).en
      : ""
  );
  const [minQty, setMinQty] = useState(product.minQty ? String(product.minQty) : "");
  const [maxQty, setMaxQty] = useState(product.maxQty ? String(product.maxQty) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProductAction(product.code, {
        nameEn,
        nameTh,
        category: category as never,
        unit,
        price: Number(price) || 0,
        pallet: Number(pallet) || 0,
        width: Number(width) || 0,
        length: Number(length) || 0,
        stackLevels: Number(stackLevels) || 0,
        containerType: containerType.trim() || "OTHER",
        minQty: Number(minQty) || 0,
        maxQty: Number(maxQty) || 0,
      });
      showToast("Product updated");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <ModalHeader title={`Edit product (แก้ไขสินค้า) · ${product.code}`} onClose={onClose} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category (หมวด)">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={inputClass}
            >
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="PACKAGING">Packaging</option>
              <option value="FINISHED_GOODS">Finished Goods</option>
              <option value="SPARE_PARTS">IO & Resin</option>
            </select>
          </Field>
          <Field label="Unit">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="ประเภท Pack · ชนิดภาชนะ (เลือกหรือพิมพ์เองได้ · แสดงในแผนผังคลัง)">
          <input
            value={containerType}
            onChange={(e) => setContainerType(e.target.value)}
            list="packTypeOptions"
            placeholder="เช่น Box, IBC หรือพิมพ์ชื่อเอง"
            className={inputClass}
          />
          <datalist id="packTypeOptions">
            {CONTAINER_TYPES.filter((t) => t.code !== "OTHER").map((t) => (
              <option key={t.code} value={t.en}>
                {t.th}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Name EN">
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Name TH (optional)">
          <input value={nameTh} onChange={(e) => setNameTh(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Price/unit">
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" className={inputClass} />
          </Field>
          <Field label="Pallet size">
            <input value={pallet} onChange={(e) => setPallet(e.target.value)} type="number" className={inputClass} />
          </Field>
        </div>
        <div className="mt-1 rounded-[10px] bg-[#f7f9fb] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
            Storage size
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Width m">
              <input value={width} onChange={(e) => setWidth(e.target.value)} type="number" step="0.01" className={inputClass} />
            </Field>
            <Field label="Length m">
              <input value={length} onChange={(e) => setLength(e.target.value)} type="number" step="0.01" className={inputClass} />
            </Field>
            <Field label="Stack levels">
              <select value={stackLevels} onChange={(e) => setStackLevels(e.target.value)} className={inputClass}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="rounded-[10px] bg-[#f7f9fb] p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
            Reorder levels (จุดสั่งซื้อ · {unit || "unit"})
          </div>
          <div className="mb-2 text-[11px] text-[#9aa4b4]">
            เว้นว่าง (0) = ใช้ค่าที่คำนวณอัตโนมัติจากการรับ/จ่ายจริง
            {product.autoMin || product.autoMax
              ? ` · ตอนนี้ auto = ${product.autoMin.toLocaleString()} / ${product.autoMax.toLocaleString()}`
              : ""}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Min (ต่ำสุด · แจ้งเตือนเมื่อต่ำกว่า)">
              <input value={minQty} onChange={(e) => setMinQty(e.target.value)} type="number" step="1" placeholder={product.autoMin ? `auto ${product.autoMin}` : "0 = auto"} className={inputClass} />
            </Field>
            <Field label="Max (สูงสุด · เพดานสต็อก)">
              <input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} type="number" step="1" placeholder={product.autoMax ? `auto ${product.autoMax}` : "0 = auto"} className={inputClass} />
            </Field>
          </div>
        </div>
        {error && (
          <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">
            {error}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave} className={buttonClass("primary")}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const inputClass =
  "w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-medium text-[#69748a]">{label}</span>
      {children}
    </label>
  );
}
