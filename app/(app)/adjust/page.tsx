import { getLotOptions, getRecentAdjustments } from "@/lib/views/docCommon";
import { AdjustForm } from "./AdjustForm";
import { DocHistory, DocHistoryRow } from "@/components/ui/DocHistory";

const REASON_LABEL: Record<string, string> = {
  COUNT_VARIANCE: "Count variance (นับพบผลต่าง)",
  DAMAGED: "Damaged (ชำรุด)",
  EXPIRED: "Expired (หมดอายุ)",
  QC_REJECT: "QC reject (ตัด QC)",
};

export default async function AdjustPage() {
  const [lots, adjustments] = await Promise.all([getLotOptions(), getRecentAdjustments()]);

  const rows: DocHistoryRow[] = adjustments.map((a) => ({
    id: a.id,
    docNo: a.docNo,
    docDate: a.docDate,
    summary: (REASON_LABEL[a.reason] ?? a.reason) + (a.note ? ` — ${a.note}` : ""),
    reversedAt: a.reversedAt,
    lineCount: a.lineCount,
    lines: a.lines.map((l) => {
      const variance = l.countedQty - l.sysQty;
      return {
        code: l.code,
        name: l.name,
        qtyText: `${l.countedQty.toLocaleString()} ${l.unit}`,
        extra: `Lot ${l.lotNo} · ${l.locationCode} · var ${variance > 0 ? "+" : ""}${variance}`,
      };
    }),
  }));

  return (
    <div className="max-w-[1240px] p-[22px_26px]">
      <AdjustForm lots={lots} />
      <DocHistory title="Recent Adjustments (ประวัติการปรับปรุง)" rows={rows} accentColor="#2f86cf" reverseKind="adjustment" />
    </div>
  );
}
