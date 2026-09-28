"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { clearTransactionsAction } from "@/lib/actions/admin";
import { showToast } from "@/components/ui/Toast";

export function ClearTransactionsCard() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    setBusy(true);
    setError(null);
    const res = await clearTransactionsAction(confirmText);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConfirmText("");
    const d = res.deleted;
    showToast(
      d
        ? `ลบแล้ว — รับ ${d.receipts} · จ่าย ${d.issues} · ย้าย ${d.transfers} · ล้างสต็อก + เริ่มเลขใหม่`
        : "ลบเอกสาร + ล้างสต็อกแล้ว — เริ่มเลขรันใหม่"
    );
    router.push("/products");
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>ล้างเอกสาร + สต็อก (เริ่มเลขรันใหม่)</CardTitle>
      <p className="mb-4 text-[13px] leading-relaxed text-[#69748a]">
        ลบเอกสาร <b>รับสินค้า · ผลิต · จ่ายสินค้า · ย้ายที่เก็บ</b> ออกทั้งหมด, ล้าง{" "}
        <b>สต็อกคงเหลือให้เป็น 0</b>, <b>รีเซ็ตยอดรับของ PO เป็น 0</b> (กลับเป็น Open, เก็บ PO ไว้), และ{" "}
        <b>รีเซ็ตเลขรันเอกสารใหม่</b> (เริ่มที่ 0001).
        <br />
        <span className="text-[#1f9d63]">
          เก็บไว้: รายการสินค้า · ที่จัดเก็บ · ใบสั่งซื้อ (PO) · ปรับปรุงสต็อก · นับสต็อก · BOM
        </span>
        <br />
        <span className="text-[#a34141]">ลบถาวร กู้คืนไม่ได้ — บัญชีผู้ใช้ไม่ถูกลบ</span>
      </p>
      <div className="rounded-[10px] bg-[#fdf6f6] p-4">
        <label className="mb-2 block text-[12.5px] font-medium text-[#a34141]">
          พิมพ์ <span className="font-num font-bold">CLEAR</span> เพื่อยืนยัน
        </label>
        <div className="flex items-center gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="CLEAR"
            className="font-num w-[160px] rounded-[8px] border border-[#eec3c3] px-3 py-2 text-[13px] outline-none focus:border-[#d24141]"
          />
          <button
            onClick={handleClear}
            disabled={busy || confirmText !== "CLEAR"}
            className={buttonClass("primary", "!bg-[#d24141] disabled:!bg-[#e8a9a9]")}
          >
            {busy ? "กำลังล้าง…" : "ล้างเอกสาร + สต็อก"}
          </button>
        </div>
        {error && <div className="mt-2 text-[12px] text-[#d24141]">{error}</div>}
      </div>
    </Card>
  );
}
