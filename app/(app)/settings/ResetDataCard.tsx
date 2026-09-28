"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { resetAllDataAction } from "@/lib/actions/admin";
import { showToast } from "@/components/ui/Toast";

export function ResetDataCard() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setBusy(true);
    setError(null);
    const res = await resetAllDataAction(confirmText);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConfirmText("");
    showToast("All data cleared — ready for fresh entry");
    router.push("/products");
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Danger Zone (โซนอันตราย)</CardTitle>
      <p className="mb-4 text-[13px] leading-relaxed text-[#69748a]">
        This permanently deletes <b>every product, lot, location, and document</b>{" "}
        (Receive / Issue / Adjust / Transfer / Count / PO / BOM / KPI logs) so the
        system starts completely empty, ready for you to enter your own real data.
        Your login is not affected.
        <br />
        <span className="text-[#a34141]">
          ลบข้อมูลสินค้า ที่เก็บ และเอกสารทุกประเภทถาวร — บัญชีผู้ใช้ไม่ถูกลบ
        </span>
      </p>
      <div className="rounded-[10px] bg-[#fdf6f6] p-4">
        <label className="mb-2 block text-[12.5px] font-medium text-[#a34141]">
          Type <span className="font-num font-bold">RESET</span> to confirm (พิมพ์ RESET
          เพื่อยืนยัน)
        </label>
        <div className="flex items-center gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            className="font-num w-[160px] rounded-[8px] border border-[#eec3c3] px-3 py-2 text-[13px] outline-none focus:border-[#d24141]"
          />
          <button
            onClick={handleReset}
            disabled={busy || confirmText !== "RESET"}
            className={buttonClass("primary", "!bg-[#d24141] disabled:!bg-[#e8a9a9]")}
          >
            {busy ? "Clearing…" : "Clear all data (ลบข้อมูลทั้งหมด)"}
          </button>
        </div>
        {error && <div className="mt-2 text-[12px] text-[#d24141]">{error}</div>}
      </div>
    </Card>
  );
}
