"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerRow } from "@/lib/views/customers";
import { buttonClass } from "@/components/ui/Button";
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
  addShipToAction,
  setDefaultShipToAction,
  deleteShipToAction,
} from "@/lib/actions/customers";

const inputClass =
  "rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#e5913a]";

type NewCust = { name: string; code: string; phone: string; taxId: string };
const EMPTY_CUST: NewCust = { name: "", code: "", phone: "", taxId: "" };

export function CustomersManager({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-customer form.
  const [newCust, setNewCust] = useState<NewCust>(EMPTY_CUST);
  // Which customer is being edited, and the edit buffer.
  const [editId, setEditId] = useState<string | null>(null);
  const [editCust, setEditCust] = useState<NewCust>(EMPTY_CUST);
  // Per-customer new ship-to input.
  const [newShip, setNewShip] = useState<Record<string, { label: string; address: string }>>({});

  async function run(fn: () => Promise<{ error?: string } | unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = (await fn()) as { error?: string };
      if (res && res.error) setError(res.error);
      else router.refresh();
      return !res?.error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    const ok = await run(() => createCustomerAction(newCust));
    if (ok) setNewCust(EMPTY_CUST);
  }

  function startEdit(c: CustomerRow) {
    setEditId(c.id);
    setEditCust({ name: c.name, code: c.code, phone: c.phone, taxId: c.taxId });
  }

  async function saveEdit(c: CustomerRow) {
    const ok = await run(() => updateCustomerAction(c.id, { ...editCust, active: c.active }));
    if (ok) setEditId(null);
  }

  function shipDraft(id: string) {
    return newShip[id] ?? { label: "", address: "" };
  }
  async function handleAddShip(customerId: string) {
    const d = shipDraft(customerId);
    const ok = await run(() => addShipToAction(customerId, d));
    if (ok) setNewShip((s) => ({ ...s, [customerId]: { label: "", address: "" } }));
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[20px] font-semibold text-[#16202e]">Customers (ลูกค้า)</h1>
        <p className="text-[12.5px] text-[#69748a]">
          ทะเบียนลูกค้า &amp; ที่อยู่จัดส่ง (Ship-to) — ใช้เลือกตอนจ่ายสินค้าออก (หน้า Transfer/จ่ายออก)
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-[10px] border border-[#f3d2d2] bg-[#fbe9e9] px-4 py-2.5 text-[12.5px] text-[#c53f3f]">
          {error}
        </div>
      )}

      {/* Add customer */}
      <div className="mb-5 rounded-[14px] border border-[#e7ebf1] bg-white p-[16px_20px] shadow-[0_1px_2px_rgba(20,30,48,.04)]">
        <div className="mb-2 text-[13px] font-semibold text-[#3a4658]">+ เพิ่มลูกค้าใหม่ (add customer)</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">ชื่อลูกค้า *</span>
            <input
              value={newCust.name}
              onChange={(e) => setNewCust((s) => ({ ...s, name: e.target.value }))}
              placeholder="ชื่อบริษัท / ลูกค้า"
              className={`${inputClass} w-[240px]`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">รหัสลูกค้า (code)</span>
            <input
              value={newCust.code}
              onChange={(e) => setNewCust((s) => ({ ...s, code: e.target.value }))}
              placeholder="เช่น SAP sold-to"
              className={`font-num ${inputClass} w-[140px]`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">โทร (phone)</span>
            <input
              value={newCust.phone}
              onChange={(e) => setNewCust((s) => ({ ...s, phone: e.target.value }))}
              className={`font-num ${inputClass} w-[130px]`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">เลขผู้เสียภาษี (tax ID)</span>
            <input
              value={newCust.taxId}
              onChange={(e) => setNewCust((s) => ({ ...s, taxId: e.target.value }))}
              className={`font-num ${inputClass} w-[150px]`}
            />
          </label>
          <button
            onClick={handleAdd}
            disabled={busy || !newCust.name.trim()}
            className={buttonClass("primary", "!bg-[#e5913a]")}
          >
            เพิ่มลูกค้า
          </button>
        </div>
      </div>

      {customers.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-[#d7dce4] p-8 text-center text-[13px] text-[#9aa4b4]">
          ยังไม่มีลูกค้า — เพิ่มลูกค้าใหม่ด้านบน
        </div>
      )}

      <div className="flex flex-col gap-4">
        {customers.map((c) => {
          const editing = editId === c.id;
          const d = shipDraft(c.id);
          return (
            <div
              key={c.id}
              className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04)]"
            >
              {/* Customer header */}
              <div className="flex flex-wrap items-center gap-3 border-b border-[#eef1f5] bg-[#fafbfc] p-[14px_20px]">
                {editing ? (
                  <>
                    <input
                      value={editCust.name}
                      onChange={(e) => setEditCust((s) => ({ ...s, name: e.target.value }))}
                      className={`${inputClass} w-[220px]`}
                    />
                    <input
                      value={editCust.code}
                      onChange={(e) => setEditCust((s) => ({ ...s, code: e.target.value }))}
                      placeholder="code"
                      className={`font-num ${inputClass} w-[120px]`}
                    />
                    <input
                      value={editCust.phone}
                      onChange={(e) => setEditCust((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="phone"
                      className={`font-num ${inputClass} w-[120px]`}
                    />
                    <input
                      value={editCust.taxId}
                      onChange={(e) => setEditCust((s) => ({ ...s, taxId: e.target.value }))}
                      placeholder="tax ID"
                      className={`font-num ${inputClass} w-[140px]`}
                    />
                    <div className="flex-1" />
                    <button onClick={() => saveEdit(c)} disabled={busy} className={buttonClass("primary", "!bg-[#1f9d63]")}>
                      บันทึก
                    </button>
                    <button onClick={() => setEditId(null)} className={buttonClass("secondary")}>
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[15px] font-semibold text-[#16202e]">
                        {c.name}
                        {!c.active && (
                          <span className="ml-2 rounded-[5px] bg-[#eef1f5] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a97a5]">
                            ปิดใช้งาน
                          </span>
                        )}
                      </div>
                      <div className="font-num mt-0.5 text-[11.5px] text-[#69748a]">
                        {c.code && <span>#{c.code} · </span>}
                        {c.phone && <span>☎ {c.phone} · </span>}
                        {c.taxId && <span>Tax {c.taxId}</span>}
                        {!c.code && !c.phone && !c.taxId && <span>—</span>}
                      </div>
                    </div>
                    <div className="flex-1" />
                    <button onClick={() => startEdit(c)} className={buttonClass("secondary")}>
                      แก้ไข
                    </button>
                    <button
                      onClick={() => run(() => updateCustomerAction(c.id, { name: c.name, code: c.code, phone: c.phone, taxId: c.taxId, active: !c.active }))}
                      disabled={busy}
                      className={buttonClass("secondary")}
                    >
                      {c.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`ลบลูกค้า "${c.name}"? (ประวัติการจ่ายเดิมยังเก็บชื่อ/ที่อยู่ไว้)`)) {
                          run(() => deleteCustomerAction(c.id));
                        }
                      }}
                      disabled={busy}
                      className="rounded-[8px] border border-[#f0c4c4] bg-[#fbe9e9] px-3 py-2 text-[12.5px] font-semibold text-[#c53f3f]"
                    >
                      ลบ
                    </button>
                  </>
                )}
              </div>

              {/* Ship-to addresses */}
              <div className="p-[12px_20px]">
                <div className="mb-2 text-[12px] font-semibold text-[#69748a]">ที่อยู่จัดส่ง (Ship-to addresses)</div>
                {c.shipTos.length === 0 ? (
                  <div className="mb-3 text-[12px] text-[#9aa4b4]">ยังไม่มีที่อยู่ — เพิ่มด้านล่าง</div>
                ) : (
                  <div className="mb-3 flex flex-col gap-1.5">
                    {c.shipTos.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 rounded-[9px] border border-[#eef1f5] px-3 py-2"
                      >
                        <span className="min-w-[110px] text-[12.5px] font-semibold text-[#3a4658]">
                          {s.label}
                          {s.isDefault && (
                            <span className="ml-1.5 rounded-[5px] bg-[#fdf0e2] px-1.5 py-0.5 text-[10px] font-semibold text-[#bd6f12]">
                              ★ default
                            </span>
                          )}
                        </span>
                        <span className="flex-1 text-[12px] text-[#69748a]">{s.address}</span>
                        {!s.isDefault && (
                          <button
                            onClick={() => run(() => setDefaultShipToAction(s.id))}
                            disabled={busy}
                            className="rounded-[6px] border border-[#f0d6b3] bg-[#fdf3e5] px-2 py-0.5 text-[11px] font-semibold text-[#bd6f12]"
                          >
                            ตั้งเป็นหลัก
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`ลบที่อยู่ "${s.label}"?`)) run(() => deleteShipToAction(s.id));
                          }}
                          disabled={busy}
                          className="text-[15px] text-[#c2606f]"
                          title="ลบที่อยู่"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    value={d.label}
                    onChange={(e) => setNewShip((st) => ({ ...st, [c.id]: { ...shipDraft(c.id), label: e.target.value } }))}
                    placeholder="ชื่อที่อยู่ (เช่น คลังหลัก)"
                    className={`${inputClass} w-[170px]`}
                  />
                  <input
                    value={d.address}
                    onChange={(e) => setNewShip((st) => ({ ...st, [c.id]: { ...shipDraft(c.id), address: e.target.value } }))}
                    placeholder="ที่อยู่จัดส่งแบบเต็ม"
                    className={`${inputClass} min-w-[260px] flex-1`}
                  />
                  <button
                    onClick={() => handleAddShip(c.id)}
                    disabled={busy || !d.label.trim() || !d.address.trim()}
                    className={buttonClass("secondary")}
                  >
                    + เพิ่มที่อยู่
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
