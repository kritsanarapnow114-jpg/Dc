"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { clearDemoDataAction, getDemoDataSummary } from "@/lib/actions/admin";
import { showToast } from "@/components/ui/Toast";

type Summary = { productCount: number; locationCount: number; lotCount: number; kpiLogCount: number };

export function ClearDemoDataCard() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDemoDataSummary().then(setSummary);
  }, []);

  async function handleClear() {
    setBusy(true);
    setError(null);
    const res = await clearDemoDataAction(confirmText);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConfirmText("");
    showToast("Demo data cleared");
    router.push("/products");
    router.refresh();
  }

  const nothingToClear = summary && summary.productCount === 0 && summary.locationCount === 0;

  return (
    <Card>
      <CardTitle>Clear Demo Data (ล้างข้อมูลตัวอย่าง)</CardTitle>
      <p className="mb-4 text-[13px] leading-relaxed text-[#69748a]">
        Removes only the original 13-product / 16-bin starter demo catalog (RM-1001,
        PK-2001, FG-3001, etc.) and every document line tied to it — including any
        real transactions you may have recorded against those demo items. Your
        SAP-imported product catalog, real locations, and everything else are left
        untouched. A document is only fully removed if every line on it was demo
        data; otherwise just the demo lines are trimmed off.
        <br />
        <span className="text-[#a34141]">
          ลบเฉพาะสินค้า/ที่เก็บตัวอย่าง 13/16 รายการเดิม และเอกสารที่เกี่ยวข้อง — ไม่แตะสินค้าจริงจาก SAP
        </span>
      </p>

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 text-center text-[12px] sm:grid-cols-4">
          <div className="rounded-[8px] bg-[#f7f9fb] p-2.5">
            <div className="font-num text-[16px] font-bold">{summary.productCount}</div>
            <div className="text-[#9aa4b4]">demo products</div>
          </div>
          <div className="rounded-[8px] bg-[#f7f9fb] p-2.5">
            <div className="font-num text-[16px] font-bold">{summary.locationCount}</div>
            <div className="text-[#9aa4b4]">demo bins</div>
          </div>
          <div className="rounded-[8px] bg-[#f7f9fb] p-2.5">
            <div className="font-num text-[16px] font-bold">{summary.lotCount}</div>
            <div className="text-[#9aa4b4]">demo lots</div>
          </div>
          <div className="rounded-[8px] bg-[#f7f9fb] p-2.5">
            <div className="font-num text-[16px] font-bold">{summary.kpiLogCount}</div>
            <div className="text-[#9aa4b4]">demo KPI logs</div>
          </div>
        </div>
      )}

      {nothingToClear ? (
        <div className="rounded-[10px] bg-[#f7f9fb] p-4 text-[12.5px] text-[#69748a]">
          No demo data found — already cleared.
        </div>
      ) : (
        <div className="rounded-[10px] bg-[#fdf6f6] p-4">
          <label className="mb-2 block text-[12.5px] font-medium text-[#a34141]">
            Type <span className="font-num font-bold">CLEAR DEMO</span> to confirm (พิมพ์ CLEAR DEMO
            เพื่อยืนยัน)
          </label>
          <div className="flex items-center gap-3">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CLEAR DEMO"
              className="font-num w-[180px] rounded-[8px] border border-[#eec3c3] px-3 py-2 text-[13px] outline-none focus:border-[#d24141]"
            />
            <button
              onClick={handleClear}
              disabled={busy || confirmText !== "CLEAR DEMO"}
              className={buttonClass("primary", "!bg-[#d24141] disabled:!bg-[#e8a9a9]")}
            >
              {busy ? "Clearing…" : "Clear demo data (ล้างข้อมูลตัวอย่าง)"}
            </button>
          </div>
          {error && <div className="mt-2 text-[12px] text-[#d24141]">{error}</div>}
        </div>
      )}
    </Card>
  );
}
