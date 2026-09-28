import "server-only";
import { db } from "@/lib/db";
import {
  lotFloorArea,
  binCapacity,
  occupancyPct,
  occupancyBarTone,
  binStatusTone,
  BAR_TONE_COLOR,
  BinTone,
} from "@/lib/calc/storage";
import { ZONE_LABEL } from "@/components/ui/tone";
import { todayBangkok } from "@/lib/calc/date";

export type BinContent = {
  productCode: string;
  nameEn: string;
  lotNo: string;
  qty: number;
  unit: string;
  area: number;
  stackLevels: number;
  lotStatus: "OK" | "QC";
  expired: boolean;
  isExtra?: boolean; // non-stock item (Reuse, empty pallets…)
};

// Footprint of one non-stock pallet (matches the map's estimate).
const DEFAULT_PALLET_M2 = 0.96;

export type ExtraItemRow = { id: string; label: string; pallets: number };

function parseExtraItems(raw: unknown): ExtraItemRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraItemRow[] = [];
  for (const e of raw) {
    if (e && typeof e === "object") {
      const label = typeof (e as { label?: unknown }).label === "string" ? (e as { label: string }).label : "";
      const id = typeof (e as { id?: unknown }).id === "string" ? (e as { id: string }).id : "";
      const pallets = Number((e as { pallets?: unknown }).pallets);
      if (label && id && Number.isFinite(pallets) && pallets > 0)
        out.push({ id, label, pallets: Math.max(1, Math.trunc(pallets)) });
    }
  }
  return out;
}

export type LocationRow = {
  code: string;
  zone: string;
  zoneLabel: string;
  width: number;
  length: number;
  capArea: number;
  usedArea: number;
  pct: number;
  barColor: string;
  tone: BinTone;
  contents: BinContent[];
  extras: ExtraItemRow[]; // non-stock items placed here (Reuse, empty pallets…)
  stackUsed: number | null; // actual stack set by the user (null = stack to max)
  stackMax: number; // how high the product could stack
};

async function loadAllRows(): Promise<LocationRow[]> {
  const [locations, lots] = await Promise.all([
    db.location.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    // Depleted lots (qty 0) don't occupy the bin — leave them out of contents.
    db.lot.findMany({ where: { qty: { gt: 0 } }, include: { product: true } }),
  ]);

  const today = todayBangkok();
  type RawLot = {
    productCode: string;
    nameEn: string;
    lotNo: string;
    qty: number;
    unit: string;
    width: number;
    length: number;
    stackLevels: number;
    pallet: number;
    lotStatus: "OK" | "QC";
    expired: boolean;
  };
  const rawByLoc = new Map<string, RawLot[]>();
  const stackMaxByLoc = new Map<string, number>();
  for (const l of lots) {
    const arr = rawByLoc.get(l.locationCode) ?? [];
    arr.push({
      productCode: l.product.code,
      nameEn: l.product.nameEn,
      lotNo: l.lotNo,
      qty: l.qty,
      unit: l.product.unit,
      width: l.product.width,
      length: l.product.length,
      stackLevels: l.product.stackLevels,
      pallet: l.product.pallet,
      lotStatus: l.status,
      expired: !!(l.expDate && l.expDate < today),
    });
    rawByLoc.set(l.locationCode, arr);
    stackMaxByLoc.set(
      l.locationCode,
      Math.max(stackMaxByLoc.get(l.locationCode) ?? 1, l.product.stackLevels || 1)
    );
  }

  return locations.map((loc) => {
    const raw = rawByLoc.get(loc.code) ?? [];
    // Same lot received more than once lands in the bin as separate stock
    // records — merge them into one line (sum the qty) so a lot shows once.
    // Keep status/expiry in the key so a QC-held or expired split stays visible.
    const mergedByLot = new Map<string, RawLot>();
    for (const r of raw) {
      const key = `${r.productCode}||${r.lotNo}||${r.lotStatus}||${r.expired}`;
      const ex = mergedByLot.get(key);
      if (ex) ex.qty += r.qty;
      else mergedByLot.set(key, { ...r });
    }
    const mergedRaw = [...mergedByLot.values()];
    // Actual stack really used in this bin (may be less than the product max),
    // so stacking fewer levels shows a higher % used — same model as the map.
    const stackMax = Math.max(1, stackMaxByLoc.get(loc.code) ?? 1);
    const actualStack =
      loc.stackUsed != null ? Math.min(stackMax, Math.max(1, loc.stackUsed)) : stackMax;

    const contents: BinContent[] = mergedRaw.map((r) => {
      const area = lotFloorArea(r.qty, r.width, r.length, Math.min(r.stackLevels, actualStack), r.pallet);
      return {
        productCode: r.productCode,
        nameEn: r.nameEn,
        lotNo: r.lotNo,
        qty: r.qty,
        unit: r.unit,
        area: Math.round(area * 100) / 100,
        stackLevels: r.stackLevels,
        lotStatus: r.lotStatus,
        expired: r.expired,
      };
    });
    // Non-stock items (Reuse, empty pallets…) also occupy floor space.
    const extras = parseExtraItems(loc.extraItems);
    for (const e of extras) {
      contents.push({
        productCode: "—",
        nameEn: `${e.label} (ของอื่น ๆ)`,
        lotNo: "—",
        qty: e.pallets,
        unit: "พาเลท",
        area: Math.round(e.pallets * DEFAULT_PALLET_M2 * 100) / 100,
        stackLevels: 1,
        lotStatus: "OK",
        expired: false,
        isExtra: true,
      });
    }

    const capArea = binCapacity(loc.width, loc.length);
    const usedArea = contents.reduce((s, c) => s + c.area, 0);
    // No room for even one more pallet → count the bin as full (100%).
    const pct = occupancyPct(usedArea, capArea, DEFAULT_PALLET_M2);
    const tone = binStatusTone({
      empty: contents.length === 0,
      hasQcHold: contents.some((c) => c.lotStatus === "QC"),
      hasExpired: contents.some((c) => c.expired),
      pctOccupied: pct,
    });
    return {
      code: loc.code,
      zone: loc.zone,
      zoneLabel: ZONE_LABEL[loc.zone],
      width: loc.width,
      length: loc.length,
      capArea: Math.round(capArea * 100) / 100,
      usedArea: Math.round(usedArea * 100) / 100,
      pct: Math.round(pct * 10) / 10,
      barColor: BAR_TONE_COLOR[occupancyBarTone(pct)],
      tone,
      contents,
      extras,
      stackUsed: loc.stackUsed ?? null,
      stackMax,
    };
  });
}

/** Bin-level rows, optionally filtered by zone (A-E). */
export async function getLocationRows(opts?: { zone?: string }): Promise<LocationRow[]> {
  const rows = await loadAllRows();
  return opts?.zone ? rows.filter((r) => r.zone === opts.zone) : rows;
}

/** Distinct zones that currently have at least one bin, in order. */
export async function getZonesInUse(): Promise<string[]> {
  const locs = await db.location.findMany({ where: { archivedAt: null }, select: { zone: true }, distinct: ["zone"] });
  return locs.map((l) => l.zone).sort();
}

/**
 * Locations page summary card: total storage used across ALL zones A-E.
 * (Unlike the Dashboard's Storage Utilization widget, which omits zone E,
 * this always includes every zone regardless of the page's zone filter.)
 */
export async function getLocationSummary(): Promise<{
  totalUsed: number;
  totalCap: number;
  totalPct: number;
  totalColor: string;
  binCount: number;
  avgOcc: number;
}> {
  const rows = await loadAllRows();
  // A bin with no room for another pallet is full — count its whole capacity as
  // used (the leftover gap is unusable), so the total reflects real fullness.
  const totalUsed = rows.reduce((s, r) => s + (r.pct >= 100 ? r.capArea : r.usedArea), 0);
  const totalCap = rows.reduce((s, r) => s + r.capArea, 0);
  const totalPct = occupancyPct(totalUsed, totalCap);
  const binCount = rows.length;
  const avgOcc = binCount > 0 ? rows.reduce((s, r) => s + r.pct, 0) / binCount : 0;
  return {
    totalUsed: Math.round(totalUsed * 100) / 100,
    totalCap: Math.round(totalCap * 100) / 100,
    totalPct: Math.round(totalPct * 10) / 10,
    totalColor: BAR_TONE_COLOR[occupancyBarTone(totalPct)],
    binCount,
    avgOcc: Math.round(avgOcc * 10) / 10,
  };
}
