"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { saveAppSettingsAction } from "@/lib/actions/settings";
import { ISSUE_TO_KEY, OPERATORS_KEY, RETURN_REASONS_KEY, RETURN_REASONS_DEFAULTS, ISSUE_TO_DEFAULTS } from "@/lib/settingsKeys";
import { showToast } from "@/components/ui/Toast";

/** Manage the editable pick-lists used by Issue ("จ่ายไปที่"), Transfer
 *  ("ผู้ปฏิบัติงาน") and Customer Returns ("เหตุผลการคืน"). One entry per line. */
export function ListSettingsCard({
  issueTo,
  operators,
  returnReasons,
}: {
  issueTo: string;
  operators: string;
  returnReasons: string;
}) {
  const router = useRouter();
  const [issueToText, setIssueToText] = useState(
    issueTo || ISSUE_TO_DEFAULTS.join("\n")
  );
  const [opsText, setOpsText] = useState(operators);
  const [reasonText, setReasonText] = useState(returnReasons || RETURN_REASONS_DEFAULTS.join("\n"));
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    await saveAppSettingsAction({
      [ISSUE_TO_KEY]: issueToText,
      [OPERATORS_KEY]: opsText,
      [RETURN_REASONS_KEY]: reasonText,
    });
    setBusy(false);
    showToast("Lists saved (บันทึกรายการแล้ว)");
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Pick-lists (รายการตัวเลือก)</CardTitle>
      <p className="mb-3 text-[12.5px] text-[#69748a]">
        เพิ่ม/ลบตัวเลือก — พิมพ์บรรทัดละ 1 รายการ (one entry per line).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-[#3a4658]">
            Issue → จ่ายไปที่ (Issue To)
          </span>
          <textarea
            value={issueToText}
            onChange={(e) => setIssueToText(e.target.value)}
            rows={6}
            className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 font-num text-[12.5px] outline-none focus:border-[#d71f28]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-[#3a4658]">
            Transfer → ผู้ปฏิบัติงาน (Operators)
          </span>
          <textarea
            value={opsText}
            onChange={(e) => setOpsText(e.target.value)}
            rows={6}
            placeholder="ชื่อผู้ปฏิบัติงานเพิ่มเติม (นอกเหนือจากรายชื่อผู้ใช้)"
            className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 font-num text-[12.5px] outline-none focus:border-[#d71f28]"
          />
          <span className="text-[11px] text-[#9aa4b4]">
            * รายชื่อผู้ใช้ในระบบจะแสดงให้อยู่แล้ว ช่องนี้ไว้เพิ่มชื่อพิเศษ
          </span>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[12px] font-medium text-[#3a4658]">
            Customer Return → เหตุผลการคืน (Return reasons)
          </span>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={5}
            className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#d71f28]"
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={handleSave} disabled={busy} className={buttonClass("primary")}>
          {busy ? "Saving…" : "Save lists (บันทึก)"}
        </button>
      </div>
    </Card>
  );
}
