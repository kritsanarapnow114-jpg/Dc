import { getIssueFormData, getRecentIssues } from "@/lib/views/issue";
import { getAppSettings } from "@/lib/views/settings";
import { ISSUE_TO_KEY, ISSUE_TO_DEFAULTS, parseList } from "@/lib/settingsKeys";
import { IssueForm } from "./IssueForm";
import { DocHistory, DocHistoryRow } from "@/components/ui/DocHistory";

export default async function IssuePage() {
  const [data, issues, settings] = await Promise.all([
    getIssueFormData(),
    getRecentIssues(),
    getAppSettings(),
  ]);
  const issueToStored = parseList(settings[ISSUE_TO_KEY]);
  const issueToOptions = issueToStored.length > 0 ? issueToStored : ISSUE_TO_DEFAULTS;

  const rows: DocHistoryRow[] = issues.map((i) => ({
    id: i.id,
    docNo: i.docNo,
    docDate: i.docDate,
    summary:
      i.issueType === "EXTERNAL"
        ? `ภายนอก · ${i.shipToName || "ลูกค้า"}`
        : `ภายใน · ${i.issueTo}`,
    reversedAt: i.reversedAt,
    materialDoc: i.materialDoc,
    remark: i.remark,
    lineCount: i.lineCount,
    lines: i.lines.map((l) => ({
      code: l.code,
      name: l.name,
      qtyText: `${l.qty.toLocaleString()} ${l.unit}`,
      extra: `Lot ${l.lotNo} · ${l.locationCode}`,
    })),
  }));

  return (
    <div className="max-w-[1240px] p-[22px_26px]">
      <IssueForm data={data} issueToOptions={issueToOptions} />
      <DocHistory title="Recent Issues (ประวัติการจ่ายสินค้า)" rows={rows} accentColor="#e5913a" reverseKind="issue" />
    </div>
  );
}
