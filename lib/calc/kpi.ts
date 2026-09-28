import "server-only";
import { db } from "@/lib/db";
import { daysBetween } from "./date";
import { Range } from "@/lib/views/dashboard";

export type KpiTone = "ok" | "warn";

export type KpiResult = {
  key: "safety" | "quality" | "delivery" | "cost" | "accuracy";
  label: string;
  th: string;
  value: string;
  target: string;
  sub: string;
  tone: KpiTone;
  loggable: boolean; // Safety/Cost/Delivery: user adds log entries. Quality/Accuracy: derived, read-only.
};

export async function safetyKpi(range: Range): Promise<KpiResult> {
  const logs = await db.kpiLog.findMany({
    where: { key: "SAFETY", date: { gte: range.start, lte: range.end } },
    orderBy: { date: "asc" },
  });
  const incidents = logs.filter((l) => l.incident);
  // Counter starts from the most recent entry of EITHER kind: a real incident,
  // or a "reset" entry that sets the safe-since date independently.
  const lastEntry = logs.length > 0 ? logs[logs.length - 1] : null;
  const sinceDate = lastEntry ? lastEntry.date : range.start;
  const daysSince = Math.max(0, daysBetween(range.end, sinceDate));

  return {
    key: "safety",
    label: "Safety",
    th: "ความปลอดภัย",
    value: String(incidents.length),
    target: "Target 0 (เป้าหมาย 0)",
    sub: `${daysSince}d since last incident`,
    tone: incidents.length === 0 ? "ok" : "warn",
    loggable: true,
  };
}

export async function costKpi(range: Range): Promise<KpiResult> {
  const logs = await db.kpiLog.findMany({
    where: { key: "COST", date: { gte: range.start, lte: range.end } },
  });
  const total = logs.reduce((s, l) => s + (l.amount ?? 0), 0);
  return {
    key: "cost",
    label: "Cost Saving",
    th: "ต้นทุน",
    value: "฿" + Math.round(total).toLocaleString("en-US"),
    target: "Savings this period (ประหยัดช่วงนี้)",
    sub: `${logs.length} entries`,
    tone: "ok",
    loggable: true,
  };
}

export async function deliveryKpi(range: Range): Promise<KpiResult> {
  const logs = await db.kpiLog.findMany({
    where: { key: "DELIVERY", date: { gte: range.start, lte: range.end } },
  });
  const total = logs.length;
  const onTime = logs.filter((l) => l.onTime).length;
  const pct = total > 0 ? (onTime / total) * 100 : 100;
  return {
    key: "delivery",
    label: "Delivery",
    th: "การส่งมอบ",
    value: pct.toFixed(1) + "%",
    target: "Target 99% (เป้าหมาย 99%)",
    sub: `${onTime}/${total} on-time`,
    tone: pct >= 99 ? "ok" : "warn",
    loggable: true,
  };
}

/** Quality for a DC = share of shipped units NOT returned by customers in the
 *  period (returns of any disposition count against it). */
export async function qualityKpi(range: Range): Promise<KpiResult> {
  const inRange = { docDate: { gte: range.start, lte: range.end }, reversedAt: null };
  const [shippedAgg, returnedAgg, returnDocs] = await Promise.all([
    db.issueLine.aggregate({ where: { issue: { ...inRange, issueType: "EXTERNAL" } }, _sum: { qty: true } }),
    db.customerReturnLine.aggregate({ where: { customerReturn: inRange }, _sum: { qty: true } }),
    db.customerReturn.count({ where: inRange }),
  ]);
  const shipped = shippedAgg._sum.qty ?? 0;
  const returned = returnedAgg._sum.qty ?? 0;
  const pct = shipped > 0 ? Math.max(0, (1 - returned / shipped) * 100) : 100;
  return {
    key: "quality",
    label: "Quality",
    th: "คุณภาพ (ไม่ถูกคืน)",
    value: pct.toFixed(1) + "%",
    target: "Target 99.5% (เป้าหมาย 99.5%)",
    sub: `${returnDocs} returns · ${returned.toLocaleString()} units`,
    tone: pct >= 99.5 ? "ok" : "warn",
    loggable: false,
  };
}

export async function accuracyKpi(range: Range): Promise<KpiResult> {
  const counts = await db.stockCount.findMany({
    where: { docDate: { gte: range.start, lte: range.end }, reversedAt: null },
    include: { lines: true },
  });
  const lines = counts.flatMap((c) => c.lines);
  const total = lines.length;
  const matched = lines.filter((l) => l.countedQty === l.sysQty).length;
  const pct = total > 0 ? (matched / total) * 100 : 100;
  return {
    key: "accuracy",
    label: "Inv. Accuracy",
    th: "ความแม่นยำสต็อก",
    value: pct.toFixed(1) + "%",
    target: "Target 99.9% (เป้าหมาย 99.9%)",
    sub: `${matched}/${total} matched`,
    tone: pct >= 99.9 ? "ok" : "warn",
    loggable: false,
  };
}

/** Full-history breakdowns for the KPI drill-down modals — intentionally not period-filtered. */
export async function qualityBreakdown() {
  const returns = await db.customerReturn.findMany({
    where: { reversedAt: null },
    include: { lines: true, customer: true },
    orderBy: { docDate: "desc" },
    take: 30,
  });
  return returns.map((r) => ({
    date: r.docDate,
    doc: r.docNo,
    customer: r.customer?.name ?? "-",
    reason: r.reason,
    qty: r.lines.reduce((s, l) => s + l.qty, 0),
    restocked: r.lines.filter((l) => l.disposition === "RESTOCK").reduce((s, l) => s + l.qty, 0),
    held: r.lines.filter((l) => l.disposition === "HOLD").reduce((s, l) => s + l.qty, 0),
    scrapped: r.lines.filter((l) => l.disposition === "SCRAP").reduce((s, l) => s + l.qty, 0),
  }));
}

export async function accuracyBreakdown() {
  const counts = await db.stockCount.findMany({
    where: { reversedAt: null },
    include: { lines: true },
    orderBy: { docDate: "desc" },
    take: 20,
  });
  return counts.map((c) => {
    const total = c.lines.length;
    const matched = c.lines.filter((l) => l.countedQty === l.sysQty).length;
    return {
      date: c.docDate,
      doc: c.docNo,
      counted: total,
      matched,
      pct: total > 0 ? (matched / total) * 100 : 100,
    };
  });
}

export async function kpiBand(range: Range): Promise<KpiResult[]> {
  const [safety, quality, delivery, cost, accuracy] = await Promise.all([
    safetyKpi(range),
    qualityKpi(range),
    deliveryKpi(range),
    costKpi(range),
    accuracyKpi(range),
  ]);
  return [safety, quality, delivery, cost, accuracy];
}
