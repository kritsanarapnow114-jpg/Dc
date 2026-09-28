import "server-only";
import { db } from "@/lib/db";
import { daysBetween, todayBangkok } from "@/lib/calc/date";
import { AGE_BUCKETS, ageBucketIndex, expiryInfo, ExpKind } from "@/lib/calc/aging";
import { getValueByExpiry } from "./dashboard";

export async function getAgeBuckets(today: Date = todayBangkok()) {
  const lots = await db.lot.findMany({ include: { product: true } });
  const buckets = AGE_BUCKETS.map((b) => ({ ...b, value: 0, count: 0 }));
  for (const l of lots) {
    const ageDays = daysBetween(today, l.recvDate);
    const idx = ageBucketIndex(ageDays);
    buckets[idx].value += l.qty * l.product.price;
    buckets[idx].count += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return buckets.map((b) => ({ ...b, pct: (b.value / max) * 100 }));
}

/** Mirrors the Dashboard's "Value by Time-to-Expiry" widget exactly (fixed 30/90/180d buckets). */
export async function getExpiryBuckets(today: Date = todayBangkok()) {
  return getValueByExpiry(today);
}

export type AgingBin = {
  lotId: string;
  locationCode: string;
  onHand: number;
  value: number;
  recvDate: string;
};

export type AgingRow = {
  lotKey: string;
  code: string;
  nameEn: string;
  lotNo: string;
  onHand: number;
  unit: string;
  value: number;
  recvDate: string;
  ageDays: number;
  mfgDate: string | null;
  expDate: string | null;
  expKind: ExpKind;
  expLabel: string;
  daysLeft: number | null;
  /** Every bin this lot sits in — shown only when the row is expanded. */
  bins: AgingBin[];
  /** All the underlying lot-record ids (one per bin), for extending shelf-life. */
  lotIds: string[];
};

export async function getAgingRows(opts: {
  filter?: "near" | "expired" | "all";
  thresholdDays: number;
  today?: Date;
}): Promise<AgingRow[]> {
  const today = opts.today ?? todayBangkok();
  const lots = await db.lot.findMany({
    where: { qty: { gt: 0 } }, // hide depleted lots — nothing left to age
    include: { product: true },
    orderBy: { recvDate: "asc" },
  });

  // Group by lot (product + lot number) — the same lot spread over several bins
  // collapses into one row; the per-bin breakdown lives in `bins`.
  const groups = new Map<string, typeof lots>();
  for (const l of lots) {
    const key = `${l.productCode}||${l.lotNo}`;
    const g = groups.get(key);
    if (g) g.push(l);
    else groups.set(key, [l]);
  }

  const rows: AgingRow[] = [...groups.entries()].map(([key, g]) => {
    const first = g[0];
    const onHand = g.reduce((s, l) => s + l.qty, 0);
    const value = g.reduce((s, l) => s + l.qty * l.product.price, 0);
    // Oldest received drives the age; soonest expiry drives the risk badge.
    const oldest = g.reduce((a, b) => (a.recvDate <= b.recvDate ? a : b));
    const withExp = g.filter((l) => l.expDate);
    const soonest = withExp.length
      ? withExp.reduce((a, b) => (a.expDate! <= b.expDate! ? a : b))
      : null;
    const expDate = soonest?.expDate ?? null;
    const mfgDate = soonest?.mfgDate ?? g.find((l) => l.mfgDate)?.mfgDate ?? null;
    const info = expiryInfo(expDate, today, opts.thresholdDays);
    return {
      lotKey: key,
      code: first.productCode,
      nameEn: first.product.nameEn,
      lotNo: first.lotNo,
      onHand,
      unit: first.product.unit,
      value,
      recvDate: oldest.recvDate.toISOString(),
      ageDays: daysBetween(today, oldest.recvDate),
      mfgDate: mfgDate ? mfgDate.toISOString() : null,
      expDate: expDate ? expDate.toISOString() : null,
      expKind: info.kind,
      expLabel: info.label,
      daysLeft: info.daysLeft,
      bins: g.map((l) => ({
        lotId: l.id,
        locationCode: l.locationCode,
        onHand: l.qty,
        value: l.qty * l.product.price,
        recvDate: l.recvDate.toISOString(),
      })),
      lotIds: g.map((l) => l.id),
    };
  });

  const filtered = rows.filter((r) => {
    if (opts.filter === "near") return r.expKind === "near";
    if (opts.filter === "expired") return r.expKind === "expired";
    return true;
  });

  return filtered.sort((a, b) => b.ageDays - a.ageDays);
}
