import { getReturnFormData, getRecentReturns } from "@/lib/views/returns";
import { ReturnForm } from "./ReturnForm";
import { DocHistory, DocHistoryRow } from "@/components/ui/DocHistory";

const DISPOSITION_LABEL: Record<string, string> = {
  RESTOCK: "คืนสต็อก",
  HOLD: "กักตรวจ QC",
  SCRAP: "ตัดทิ้ง",
};

export default async function ReturnsPage() {
  const [data, returns] = await Promise.all([getReturnFormData(), getRecentReturns()]);

  const rows: DocHistoryRow[] = returns.map((r) => ({
    id: r.id,
    docNo: r.docNo,
    docDate: r.docDate,
    summary: [r.customerName || "ไม่ระบุลูกค้า", r.reason, r.issueDocNo ? `อ้างอิง ${r.issueDocNo}` : ""]
      .filter(Boolean)
      .join(" · "),
    reversedAt: r.reversedAt,
    lineCount: r.lineCount,
    lines: r.lines.map((l) => ({
      code: l.code,
      name: l.name,
      qtyText: `${l.qty.toLocaleString()} ${l.unit}`,
      extra: `${DISPOSITION_LABEL[l.disposition] ?? l.disposition} · Lot ${l.lotNo}${l.locationCode ? ` · ${l.locationCode}` : ""}`,
    })),
  }));

  return (
    <div className="max-w-[1240px] p-[16px_14px] sm:p-[22px_26px]">
      <ReturnForm data={data} />
      <DocHistory title="Recent Returns (ประวัติการรับคืน)" rows={rows} accentColor="#bd6f12" reverseKind="return" />
    </div>
  );
}
