"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { createProductAction, FormState } from "@/lib/actions/products";
import { showToast } from "@/components/ui/Toast";
import { CONTAINER_TYPES } from "@/lib/containerTypes";

const initialState: FormState = {};

export function AddProductButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("accent")}>
        ＋ Add product (เพิ่มสินค้า)
      </button>
      <AddProductModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddProductModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await createProductAction(prev, fd);
      if (!res.error) {
        showToast("Product added");
        router.refresh();
        onClose();
      }
      return res;
    },
    initialState
  );

  return (
    <Modal open={open} onClose={onClose} width={480}>
      <ModalHeader title="Add product (เพิ่มสินค้า)" onClose={onClose} />
      <form action={formAction} className="flex flex-col gap-3 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="SAP Material Master">
            <input name="code" required className={inputClass} />
          </Field>
          <Field label="Category (หมวด)">
            <select name="category" required className={inputClass} defaultValue="RAW_MATERIAL">
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="PACKAGING">Packaging</option>
              <option value="FINISHED_GOODS">Finished Goods</option>
              <option value="SPARE_PARTS">IO & Resin</option>
            </select>
          </Field>
        </div>
        <Field label="Name EN">
          <input name="nameEn" required className={inputClass} />
        </Field>
        <Field label="Name TH (optional)">
          <input name="nameTh" className={inputClass} />
        </Field>
        <Field label="ประเภท Pack · ชนิดภาชนะ (เลือกหรือพิมพ์เองได้ · แสดงในแผนผังคลัง)">
          <input
            name="containerType"
            list="packTypeOptionsAdd"
            placeholder="เช่น Box, IBC หรือพิมพ์ชื่อเอง"
            className={inputClass}
          />
          <datalist id="packTypeOptionsAdd">
            {CONTAINER_TYPES.filter((t) => t.code !== "OTHER").map((t) => (
              <option key={t.code} value={t.en}>
                {t.th}
              </option>
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Unit">
            <input name="unit" required placeholder="kg" className={inputClass} />
          </Field>
          <Field label="Price/unit">
            <input name="price" type="number" step="0.01" required className={inputClass} />
          </Field>
          <Field label="Pallet size">
            <input name="pallet" type="number" defaultValue={500} className={inputClass} />
          </Field>
        </div>
        <div className="mt-1 rounded-[10px] bg-[#f7f9fb] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
            Storage size
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Width m">
              <input name="width" type="number" step="0.01" defaultValue={1} className={inputClass} />
            </Field>
            <Field label="Length m">
              <input name="length" type="number" step="0.01" defaultValue={1} className={inputClass} />
            </Field>
            <Field label="Stack levels">
              <select name="stackLevels" defaultValue={1} className={inputClass}>
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
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
            Reorder levels (จุดสั่งซื้อ · optional)
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Min (ต่ำสุด · แจ้งเตือน)">
              <input name="minQty" type="number" step="1" defaultValue={0} placeholder="0 = ไม่กำหนด" className={inputClass} />
            </Field>
            <Field label="Max (สูงสุด · เพดาน)">
              <input name="maxQty" type="number" step="1" defaultValue={0} placeholder="0 = ไม่กำหนด" className={inputClass} />
            </Field>
          </div>
        </div>
        {state.error && (
          <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">
            {state.error}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
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
