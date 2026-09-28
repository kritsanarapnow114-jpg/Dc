import "server-only";
import { db } from "@/lib/db";
import { getProductRows } from "./products";
import { productLabel } from "@/lib/calc/productName";
import { USAGE_WINDOW_DAYS } from "@/lib/calc/reorder";

export type AbcClass = "A" | "B" | "C";
export type AbcBasis = "value" | "usage";

export type AbcRow = {
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  onHand: number;
  unit: string;
  price: number;
  metric: number; // inventory value or usage value (THB)
  pct: number; // share of total
  cumPct: number; // cumulative share
  cls: AbcClass;
};

export type AbcSummary = Record<AbcClass, { count: number; value: number; pct: number; skuPct: number }>;

/**
 * ABC (Pareto) classification of products by contribution to total value.
 * basis "value" = current inventory value (on-hand × price); basis "usage" =
 * value consumed over the last USAGE_WINDOW_DAYS (issues + BOM). Class A covers
 * the top 80% of value, B the next 15%, C the rest.
 */
export async function getAbcAnalysis(basis: AbcBasis = "value"): Promise<{
  rows: AbcRow[];
  summary: AbcSummary;
  total: number;
  basis: AbcBasis;
}> {
  const products = await getProductRows();

  const usageValue = new Map<string, number>();
  if (basis === "usage") {
    const windowStart = new Date(Date.now() - USAGE_WINDOW_DAYS * 86400000);
    const issued = await db.issueLine.groupBy({
      by: ["productCode"],
      where: { issue: { docDate: { gte: windowStart }, reversedAt: null } },
      _sum: { qty: true },
    });
    const qtyByCode = new Map<string, number>();
    for (const r of issued) qtyByCode.set(r.productCode, r._sum.qty ?? 0);
    const priceByCode = new Map(products.map((p) => [p.code, p.price]));
    for (const [code, q] of qtyByCode) usageValue.set(code, q * (priceByCode.get(code) ?? 0));
  }

  const withMetric = products.map((p) => ({
    p,
    metric: basis === "usage" ? usageValue.get(p.code) ?? 0 : p.totalValue,
  }));
  withMetric.sort((a, b) => b.metric - a.metric);

  const total = withMetric.reduce((s, x) => s + x.metric, 0) || 1;

  let cum = 0;
  const rows: AbcRow[] = withMetric.map(({ p, metric }) => {
    const prevPct = (cum / total) * 100;
    cum += metric;
    // An item is A/B based on the cumulative share reached just before it, so the
    // item that crosses a threshold still counts in the band it started in.
    const cls: AbcClass = metric <= 0 ? "C" : prevPct < 80 ? "A" : prevPct < 95 ? "B" : "C";
    return {
      code: p.code,
      name: productLabel(p.nameEn, p.nameTh),
      category: p.category,
      categoryLabel: p.categoryLabel,
      onHand: p.onHand,
      unit: p.unit,
      price: p.price,
      metric,
      pct: (metric / total) * 100,
      cumPct: (cum / total) * 100,
      cls,
    };
  });

  const summary: AbcSummary = {
    A: { count: 0, value: 0, pct: 0, skuPct: 0 },
    B: { count: 0, value: 0, pct: 0, skuPct: 0 },
    C: { count: 0, value: 0, pct: 0, skuPct: 0 },
  };
  for (const r of rows) {
    summary[r.cls].count++;
    summary[r.cls].value += r.metric;
  }
  const skuTotal = rows.length || 1;
  for (const k of ["A", "B", "C"] as AbcClass[]) {
    summary[k].pct = (summary[k].value / total) * 100;
    summary[k].skuPct = (summary[k].count / skuTotal) * 100;
  }

  return { rows, summary, total, basis };
}
