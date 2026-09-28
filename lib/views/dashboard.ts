import "server-only";
import { db } from "@/lib/db";
import { productLabel } from "@/lib/calc/productName";
import { getAutoLevelsMap } from "@/lib/views/products";
import { daysBetween, fmtDateBE, todayBangkok } from "@/lib/calc/date";
import { getLotsAsOf } from "@/lib/calc/snapshot";
import { getAppSettings } from "@/lib/views/settings";
import { getCountPlanDetailed } from "@/lib/settingsKeys";
import {
  lotFloorArea,
  binCapacity,
  occupancyPct,
  occupancyBarTone,
  BAR_TONE_COLOR,
} from "@/lib/calc/storage";
import { CATEGORY_COLORS, CATEGORY_COLOR_FALLBACK, CATEGORY_LABEL, ZONE_LABEL } from "@/components/ui/tone";
import { EXPIRY_BUCKETS, expiryBucketIndex } from "@/lib/calc/aging";
import { Category, Zone } from "@prisma/client";

export type Range = { start: Date; end: Date };

export async function getInventoryStats(range: Range) {
  const [products, snapshot] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null } }),
    getLotsAsOf(range.end),
  ]);
  const priceByCode = new Map(products.map((p) => [p.code, p.price]));
  const activeCodes = new Set(products.map((p) => p.code));
  const activeLots = snapshot.filter((l) => activeCodes.has(l.productCode));

  const inventoryValue = activeLots.reduce((s, l) => s + l.qty * (priceByCode.get(l.productCode) ?? 0), 0);
  const skuCount = products.length;
  const lotCount = activeLots.length;

  const [recvAgg, issAgg] = await Promise.all([
    db.receiptLine.findMany({
      where: { receipt: { docDate: { gte: range.start, lte: range.end }, reversedAt: null } },
      select: { recvQty: true },
    }),
    db.issueLine.findMany({
      where: { issue: { docDate: { gte: range.start, lte: range.end }, reversedAt: null } },
      select: { qty: true },
    }),
  ]);
  const receivedUnits = recvAgg.reduce((s, r) => s + r.recvQty, 0);
  const issuedUnits = issAgg.reduce((s, r) => s + r.qty, 0);

  const lossValue = activeLots
    .filter((l) => l.expDate && l.expDate < range.end)
    .reduce((s, l) => s + l.qty * (priceByCode.get(l.productCode) ?? 0), 0);

  return { inventoryValue, skuCount, lotCount, receivedUnits, issuedUnits, lossValue };
}

/** Dashboard's Storage Utilization widget only shows zones A-C (the active zone set — legacy D/E bins, if any, still count toward the total). */
export async function getStorageUtilization(asOf: Date) {
  const [locations, products, snapshot] = await Promise.all([
    db.location.findMany({ where: { archivedAt: null } }),
    db.product.findMany(),
    getLotsAsOf(asOf),
  ]);
  const productByCode = new Map(products.map((p) => [p.code, p]));

  const usedByLoc = new Map<string, number>();
  for (const l of snapshot) {
    const p = productByCode.get(l.productCode);
    if (!p) continue;
    const area = lotFloorArea(l.qty, p.width, p.length, p.stackLevels, p.pallet);
    usedByLoc.set(l.locationCode, (usedByLoc.get(l.locationCode) ?? 0) + area);
  }

  let totalUsed = 0;
  let totalCap = 0;
  const zoneAgg = new Map<string, { used: number; cap: number }>();
  for (const loc of locations) {
    const cap = binCapacity(loc.width, loc.length);
    const used = usedByLoc.get(loc.code) ?? 0;
    totalUsed += used;
    totalCap += cap;
    const z = zoneAgg.get(loc.zone) ?? { used: 0, cap: 0 };
    z.used += used;
    z.cap += cap;
    zoneAgg.set(loc.zone, z);
  }

  const zones = (["A", "B", "C"] as Zone[])
    .filter((z) => zoneAgg.has(z))
    .map((z) => {
      const agg = zoneAgg.get(z)!;
      const pct = occupancyPct(agg.used, agg.cap);
      return {
        name: z,
        desc: ZONE_LABEL[z],
        pct: Math.round(pct * 10) / 10,
        used: agg.used,
        cap: agg.cap,
        color: BAR_TONE_COLOR[occupancyBarTone(pct)],
      };
    });

  const totalPct = occupancyPct(totalUsed, totalCap);
  return {
    totalUsed: Math.round(totalUsed * 100) / 100,
    totalCap: Math.round(totalCap * 100) / 100,
    totalPct: Math.round(totalPct * 10) / 10,
    totalColor: BAR_TONE_COLOR[occupancyBarTone(totalPct)],
    zones,
  };
}

export async function getValueByCategory(asOf: Date) {
  const [products, snapshot] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null } }),
    getLotsAsOf(asOf),
  ]);
  const productByCode = new Map(products.map((p) => [p.code, p]));

  const byCategory = new Map<string, number>();
  for (const l of snapshot) {
    const p = productByCode.get(l.productCode);
    if (!p) continue;
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + l.qty * p.price);
  }
  const rows = (Object.keys(CATEGORY_LABEL) as Category[])
    .filter((c) => byCategory.has(c))
    .map((c) => ({
      name: `${CATEGORY_LABEL[c].en} (${CATEGORY_LABEL[c].th})`,
      value: byCategory.get(c) ?? 0,
      color: CATEGORY_COLORS[c] ?? CATEGORY_COLOR_FALLBACK,
    }));
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => ({ ...r, pct: (r.value / max) * 100 }));
}

export async function getValueByExpiry(asOf: Date = todayBangkok()) {
  const [products, snapshot] = await Promise.all([db.product.findMany(), getLotsAsOf(asOf)]);
  const productByCode = new Map(products.map((p) => [p.code, p]));

  const buckets = EXPIRY_BUCKETS.map((b) => ({ ...b, value: 0, count: 0 }));
  for (const l of snapshot) {
    const p = productByCode.get(l.productCode);
    if (!p) continue;
    const daysLeft = l.expDate ? daysBetween(l.expDate, asOf) : null;
    const idx = expiryBucketIndex(daysLeft);
    buckets[idx].value += l.qty * p.price;
    buckets[idx].count += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const atRiskValue = buckets[0].value + buckets[1].value + buckets[2].value;
  return {
    buckets: buckets.map((b) => ({ ...b, pct: (b.value / max) * 100 })),
    atRiskValue,
  };
}

export async function getMovementDetail(range: Range, limit = 5) {
  const [recv, iss] = await Promise.all([
    db.receiptLine.groupBy({
      by: ["productCode"],
      where: { receipt: { docDate: { gte: range.start, lte: range.end }, reversedAt: null } },
      _sum: { recvQty: true },
    }),
    db.issueLine.groupBy({
      by: ["productCode"],
      where: { issue: { docDate: { gte: range.start, lte: range.end }, reversedAt: null } },
      _sum: { qty: true },
    }),
  ]);
  const products = await db.product.findMany({
    where: { code: { in: [...recv.map((r) => r.productCode), ...iss.map((r) => r.productCode)] } },
  });
  const nameOf = (code: string) => products.find((p) => p.code === code);

  const received = recv
    .map((r) => ({ code: r.productCode, name: nameOf(r.productCode)?.nameEn ?? r.productCode, qty: r._sum.recvQty ?? 0 }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
  const issued = iss
    .map((r) => ({ code: r.productCode, name: nameOf(r.productCode)?.nameEn ?? r.productCode, qty: r._sum.qty ?? 0 }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);

  return { received, issued };
}

/** Top products by on-hand inventory value, as of a date. */
export async function getTopProductsByValue(asOf: Date, limit = 10) {
  const [products, snapshot] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null } }),
    getLotsAsOf(asOf),
  ]);
  const pByCode = new Map(products.map((p) => [p.code, p]));
  const valByCode = new Map<string, number>();
  for (const l of snapshot) {
    const p = pByCode.get(l.productCode);
    if (!p) continue;
    valByCode.set(l.productCode, (valByCode.get(l.productCode) ?? 0) + l.qty * p.price);
  }
  const grand = [...valByCode.values()].reduce((s, v) => s + v, 0);
  const rows = [...valByCode.entries()]
    .filter(([, v]) => v > 0)
    .map(([code, value]) => {
      const p = pByCode.get(code)!;
      return { code, name: productLabel(p.nameEn, p.nameTh), value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => ({
    ...r,
    barPct: (r.value / max) * 100,
    share: grand > 0 ? (r.value / grand) * 100 : 0,
  }));
}

/** Top vendors (partners) by received PO value within the period. */
export async function getTopVendors(range: Range, limit = 10) {
  const pos = await db.purchaseOrder.findMany({
    where: { date: { gte: range.start, lte: range.end } },
    include: { lines: { include: { product: true } } },
  });
  const byVendor = new Map<string, { value: number; docs: number }>();
  for (const po of pos) {
    const value = po.lines.reduce((s, l) => s + l.received * l.product.price, 0);
    const g = byVendor.get(po.vendor) ?? { value: 0, docs: 0 };
    g.value += value;
    g.docs += 1;
    byVendor.set(po.vendor, g);
  }
  const grand = [...byVendor.values()].reduce((s, g) => s + g.value, 0);
  const rows = [...byVendor.entries()]
    .map(([name, g]) => ({ name, value: g.value, docs: g.docs }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => ({
    ...r,
    barPct: (r.value / max) * 100,
    share: grand > 0 ? (r.value / grand) * 100 : 0,
  }));
}

export async function getSlowMoving(asOf: Date = todayBangkok(), thresholdDays = 60) {
  const [products, snapshot] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null } }),
    getLotsAsOf(asOf),
  ]);
  const onHandByProduct = new Map<string, number>();
  for (const l of snapshot) {
    onHandByProduct.set(l.productCode, (onHandByProduct.get(l.productCode) ?? 0) + l.qty);
  }

  const lastIssues = await db.issueLine.findMany({
    where: { issue: { docDate: { lte: asOf }, reversedAt: null } },
    include: { issue: true },
  });
  const lastIssueByProduct = new Map<string, Date>();
  for (const l of lastIssues) {
    const cur = lastIssueByProduct.get(l.productCode);
    if (!cur || l.issue.docDate > cur) lastIssueByProduct.set(l.productCode, l.issue.docDate);
  }

  const rows = products
    .map((p) => {
      const onHand = onHandByProduct.get(p.code) ?? 0;
      const last = lastIssueByProduct.get(p.code) ?? null;
      const days = last ? daysBetween(asOf, last) : null;
      return {
        code: p.code,
        name: p.nameEn,
        onHand,
        value: onHand * p.price,
        lastText: last ? fmtDateBE(last) : "never",
        days: days ?? 9999,
      };
    })
    .filter((r) => r.onHand > 0 && r.days >= thresholdDays)
    .sort((a, b) => b.days - a.days);

  return rows;
}

export async function getCountProgress(asOf: Date = todayBangkok()) {
  const totalLots = (await getLotsAsOf(asOf)).length;
  const settings = await getAppSettings();
  const plan = getCountPlanDetailed(settings);
  // Per-month/week target wins; then the legacy single value; else "count every lot".
  const monthPlanFor = (monthIdx: number) =>
    plan.months[monthIdx] ?? plan.monthlyFallback ?? totalLots;
  const weekPlanFor = (weekIdx: number) =>
    plan.weeks[weekIdx] ?? plan.weeklyFallback ?? totalLots;
  const counts = await db.stockCount.findMany({
    where: { docDate: { lte: asOf }, reversedAt: null },
    include: { lines: true },
  });

  function bucketFor(date: Date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  // Calendar order Jan → Dec of the current year.
  const year = asOf.getFullYear();
  const monthly: { label: string; counted: number; plan: number }[] = [];
  for (let mo = 0; mo < 12; mo++) {
    const d = new Date(year, mo, 1);
    const key = `${year}-${mo}`;
    const countedLots = new Set<string>();
    for (const c of counts) {
      if (bucketFor(c.docDate) === key) {
        for (const l of c.lines) countedLots.add(l.lotId);
      }
    }
    monthly.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      counted: countedLots.size,
      plan: monthPlanFor(mo),
    });
  }

  const weekStart = new Date(asOf);
  weekStart.setDate(1);
  const weekly: { label: string; counted: number; plan: number }[] = [];
  for (let w = 0; w < 5; w++) {
    const from = new Date(weekStart);
    from.setDate(from.getDate() + w * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    if (from.getMonth() !== asOf.getMonth()) break;
    const countedLots = new Set<string>();
    for (const c of counts) {
      if (c.docDate >= from && c.docDate <= to) {
        for (const l of c.lines) countedLots.add(l.lotId);
      }
    }
    weekly.push({ label: `W${w + 1}`, counted: countedLots.size, plan: weekPlanFor(w) });
  }

  return { monthly, weekly };
}

export type MovementBucket = { label: string; recv: number; issue: number };

export async function getMovementBuckets(range: Range): Promise<MovementBucket[]> {
  const totalDays = daysBetween(range.end, range.start) + 1;
  const numBuckets = Math.min(9, Math.max(3, totalDays));
  const bucketSize = Math.ceil(totalDays / numBuckets);

  const [recvLines, issueLines] = await Promise.all([
    db.receiptLine.findMany({
      where: { receipt: { docDate: { gte: range.start, lte: range.end }, reversedAt: null } },
      include: { receipt: true },
    }),
    db.issueLine.findMany({
      where: { issue: { docDate: { gte: range.start, lte: range.end }, reversedAt: null } },
      include: { issue: true },
    }),
  ]);

  const buckets: MovementBucket[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const bStart = new Date(range.start);
    bStart.setDate(bStart.getDate() + i * bucketSize);
    const bEnd = new Date(bStart);
    bEnd.setDate(bEnd.getDate() + bucketSize - 1);
    const clampedEnd = bEnd > range.end ? range.end : bEnd;
    if (bStart > range.end) break;

    const recv = recvLines
      .filter((r) => r.receipt.docDate >= bStart && r.receipt.docDate <= clampedEnd)
      .reduce((s, r) => s + r.recvQty, 0);
    const issue = issueLines
      .filter((r) => r.issue.docDate >= bStart && r.issue.docDate <= clampedEnd)
      .reduce((s, r) => s + r.qty, 0);

    buckets.push({ label: fmtDateBE(clampedEnd).slice(0, 5), recv, issue });
  }
  return buckets;
}

export async function getActionRequired(asOf: Date = todayBangkok()) {
  const [qcCount, snapshot, overduePOs, allProducts, autoMap] = await Promise.all([
    // QC hold has no change history to reconstruct — always reflects current status.
    db.lot.count({ where: { status: "QC" } }),
    getLotsAsOf(asOf),
    db.purchaseOrder.findMany({
      where: {
        status: { not: "COMPLETE" },
        date: { lt: new Date(asOf.getTime() - 14 * 86400000) },
      },
    }),
    db.product.findMany({ where: { deletedAt: null }, select: { code: true, minQty: true } }),
    getAutoLevelsMap(),
  ]);
  const expCount = snapshot.filter(
    (l) => l.expDate && l.expDate <= new Date(asOf.getTime() + 30 * 86400000)
  ).length;
  const onHandByCode = new Map<string, number>();
  for (const l of snapshot) onHandByCode.set(l.productCode, (onHandByCode.get(l.productCode) ?? 0) + l.qty);
  // Effective min = manual override if set, else the usage-derived auto level.
  const belowMin = allProducts.filter((p) => {
    const effMin = p.minQty > 0 ? p.minQty : autoMap.get(p.code)?.autoMin ?? 0;
    return effMin > 0 && (onHandByCode.get(p.code) ?? 0) < effMin;
  }).length;
  return { qcCount, expCount, overduePOs: overduePOs.map((p) => p.no), belowMin };
}
