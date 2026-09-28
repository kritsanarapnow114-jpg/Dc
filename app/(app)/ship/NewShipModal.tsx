"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { CuteBoxPopup } from "@/components/ui/CuteBoxPopup";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createShipOrderAction } from "@/lib/actions/ship";
import { fmtDateISO } from "@/lib/calc/date";
import type { ShipCustomer, ShipProduct } from "@/lib/views/ship";

type Line = { productCode: string; name: string; unit: string; ordered: string };

export function NewShipButton({
  customers,
  products,
}: {
  customers: ShipCustomer[];
  products: ShipProduct[];
}) {
  const [open, setOpen] = useState(false);
  const [createdNo, setCreatedNo] = useState<string | null>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("accent")}>
        ＋ New Ship Order (สร้างออเดอร์จัดส่ง)
      </button>
      <NewShipModal
        open={open}
        customers={customers}
        products={products}
        onClose={() => setOpen(false)}
        onCreated={(no) => setCreatedNo(no)}
      />
      <CuteBoxPopup
        open={!!createdNo}
        kind="out"
        message={`Ship order ${createdNo ?? ""} created.`}
        onClose={() => setCreatedNo(null)}
      />
    </>
  );
}

function NewShipModal({
  open,
  customers,
  products,
  onClose,
  onCreated,
}: {
  open: boolean;
  customers: ShipCustomer[];
  products: ShipProduct[];
  onClose: () => void;
  onCreated: (no: string) => void;
}) {
  const router = useRouter();
  const [no, setNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [orderDate, setOrderDate] = useState(fmtDateISO(new Date()));
  const [requestedShipDate, setRequestedShipDate] = useState("");
  const [tracking, setTracking] = useState("");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const shipTos = selectedCustomer?.shipTos ?? [];
  const available = products.filter((p) => !lines.some((l) => l.productCode === p.code));

  function selectCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    const def = c?.shipTos.find((s) => s.isDefault) ?? c?.shipTos[0];
    setShipToId(def?.id ?? "");
  }

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
    setCustomerId("");
    setShipToId("");
    setRequestedShipDate("");
    setTracking("");
    setRemark("");
    setLines([]);
    setError(null);
  }

  async function handleCreate() {
    if (!customerId) {
      setError("กรุณาเลือกลูกค้า (select a customer)");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createShipOrderAction({
      no: no.trim() || undefined,
      customerId,
      shipToId: shipToId || null,
      orderDate,
      requestedShipDate: requestedShipDate || null,
      tracking: tracking || null,
      remark: remark || null,
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
    <Modal open={open} onClose={onClose} width={580}>
      <ModalHeader title="New Ship Order (สร้างออเดอร์จัดส่ง)" onClose={onClose} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Order No. (เลขออเดอร์) — optional, auto if blank">
            <input
              value={no}
              onChange={(e) => setNo(e.target.value)}
              placeholder="SO-2569-0099"
              className={`${inputClass} font-num`}
            />
          </Field>
          <Field label="Order date (วันสั่ง)">
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className={`${inputClass} font-num`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Customer (ลูกค้า)">
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
              className={inputClass}
            />
          </Field>
          <Field label="Ship-to (ที่อยู่จัดส่ง)">
            {selectedCustomer ? (
              shipTos.length > 0 ? (
                <select
                  value={shipToId}
                  onChange={(e) => setShipToId(e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  {shipTos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                      {s.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="pt-2 text-[12px] text-[#c2606f]">
                  ยังไม่มีที่อยู่ — เพิ่มในหน้า Customers
                </div>
              )
            ) : (
              <div className="pt-2 text-[12px] text-[#9aa4b4]">เลือกลูกค้าก่อน</div>
            )}
          </Field>
        </div>

        {selectedCustomer && shipToId && (
          <div className="-mt-1 max-w-full text-[11px] leading-snug text-[#69748a]">
            {shipTos.find((s) => s.id === shipToId)?.address}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Requested ship date (วันนัดส่ง) — optional">
            <input
              type="date"
              value={requestedShipDate}
              onChange={(e) => setRequestedShipDate(e.target.value)}
              className={`${inputClass} font-num`}
            />
          </Field>
          <Field label="Tracking / carrier (เลขติดตาม/ขนส่ง) — optional">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. Kerry TH123…"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Remark (หมายเหตุ) — optional">
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติม"
            className={inputClass}
          />
        </Field>

        <div className="mt-1 overflow-hidden rounded-[10px] border border-[#e7ebf1]">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[8px_12px] font-medium">Material Description</th>
                <th className="p-[8px_12px] text-right font-medium">Order qty</th>
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
