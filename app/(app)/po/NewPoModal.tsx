"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createPoAction } from "@/lib/actions/po";
import { fmtDateISO } from "@/lib/calc/date";

type Product = { code: string; name: string; unit: string; price: number };
type Line = { productCode: string; name: string; unit: string; ordered: string };

export function NewPoButton({ products, vendors = [] }: { products: Product[]; vendors?: string[] }) {
  const [open, setOpen] = useState(false);
  const [createdNo, setCreatedNo] = useState<string | null>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("accent")}>
        ＋ New PO (สร้างใบสั่งซื้อ)
      </button>
      <NewPoModal
        open={open}
        products={products}
        vendors={vendors}
        onClose={() => setOpen(false)}
        onCreated={(no) => setCreatedNo(no)}
      />
      <CuteBoxPopup
        open={!!createdNo}
        kind="po"
        message={`Purchase order ${createdNo ?? ""} created.`}
        onClose={() => setCreatedNo(null)}
      />
    </>
  );
}

function NewPoModal({
  open,
  products,
  vendors,
  onClose,
  onCreated,
}: {
  open: boolean;
  products: Product[];
  vendors: string[];
  onClose: () => void;
  onCreated: (no: string) => void;
}) {
  const router = useRouter();
  const [no, setNo] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(fmtDateISO(new Date()));
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const available = products.filter((p) => !lines.some((l) => l.productCode === p.code));

  function addLine(code: string) {
    const p = products.find((x) => x.code === code);
    if (!p) return;
    setLines((ls) => [...ls, { productCode: p.code, name: p.name, unit: p.unit, ordered: "0" }]);
  }
  function updateLine(i: number, ordered: string) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ordered } : l)));
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  function reset() {
    setNo("");
    setVendor("");
    setLines([]);
    setError(null);
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const res = await createPoAction({
      no: no.trim() || undefined,
      vendor,
      date,
      lines: lines.map((l) => ({ productCode: l.productCode, ordered: Number(l.ordered) || 0 })),
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
    reset();
    if (res.no) onCreated(res.no);
  }

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <ModalHeader title="New Purchase Order (สร้างใบสั่งซื้อ)" onClose={onClose} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="PO No. (เลข PO) — optional, auto if blank">
            <input
              value={no}
              onChange={(e) => setNo(e.target.value)}
              placeholder="PO-2569-0099"
              className={`${inputClass} font-num`}
            />
          </Field>
          <Field label="Doc date (วันที่)">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} font-num`}
            />
          </Field>
        </div>
        <Field label="Vendor (ผู้ขาย)">
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Leave blank to set later"
            list="po-vendor-list"
            className={inputClass}
          />
          <datalist id="po-vendor-list">
            {vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>

        <div className="mt-1 overflow-hidden rounded-[10px] border border-[#e7ebf1]">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[8px_12px] font-medium">Material Description</th>
                <th className="p-[8px_12px] text-right font-medium">Ordered qty</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.productCode} className="border-t border-[#eef1f5]">
                  <td className="p-[8px_12px] font-medium">{l.name}</td>
                  <td className="p-[8px_12px] text-right">
                    <input
                      value={l.ordered}
                      onChange={(e) => updateLine(i, e.target.value)}
                      className="font-num w-[80px] rounded-[6px] border border-[#d7dce4] px-2 py-1 text-right text-[12.5px]"
                    />{" "}
                    <span className="text-[11px] text-[#9aa4b4]">{l.unit}</span>
                  </td>
                  <td className="text-center">
                    <button onClick={() => removeLine(i)} className="text-[15px] text-[#c2606f]">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-[#9aa4b4]">
                    No items yet — add a product below (optional)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-t border-[#eef1f5] p-2">
            <SearchableSelect
              options={available.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
              onSelect={addLine}
              placeholder="+ Add product… — พิมพ์ค้นหา"
              className="w-full rounded-[7px] border border-dashed border-[#c4ccd8] bg-[#f7f9fb] px-2.5 py-1.5 text-[12.5px] text-[#3a4658] outline-none focus:border-[#2f86cf]"
            />
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
          <button onClick={handleCreate} disabled={saving} className={buttonClass("primary")}>
            {saving ? "Creating…" : "Create"}
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
