/**
 * Storage area / capacity math.
 * A product's width x length is the floor footprint of ONE PALLET of that
 * product (not of a single kg/pc). So area per base unit (kg/pc) =
 * (width x length) / (palletSize x stackLevels) -- a full pallet load
 * occupies one footprint, stacking lets multiple pallets share that
 * footprint vertically.
 * Bin capacity = width x length (stacking does not change bin capacity
 * itself, only how much floor-footprint one unit of a given product
 * consumes).
 *
 * Two independent color-threshold scales are used on purpose (per design spec):
 *  - bin's own status badge: Full >=95%, Near full >=80%, else OK
 *  - zone/total utilization bar fill: red >=85%, amber >=70%, else green
 */

export function areaPerUnit(
  width: number,
  length: number,
  stackLevels: number,
  palletSize: number
): number {
  return (width * length) / (Math.max(1, stackLevels) * Math.max(1, palletSize));
}

/**
 * Floor footprint (m²) a SINGLE lot occupies, pallet-based:
 *  - the lot fills whole pallets — a partial pallet still takes a full one;
 *  - different lots never share a pallet (each lot rounds up on its own);
 *  - stacking lets `stackLevels` pallets share one floor spot.
 * This is the realistic warehouse view (a 25 kg remnant still needs a pallet),
 * unlike `areaPerUnit` which spreads area continuously by quantity.
 */
export function lotFloorArea(
  qty: number,
  width: number,
  length: number,
  stackLevels: number,
  palletSize: number
): number {
  if (qty <= 0) return 0;
  const pallets = Math.ceil(qty / Math.max(1, palletSize));
  const spots = Math.ceil(pallets / Math.max(1, stackLevels));
  return spots * width * length;
}

export function binCapacity(width: number, length: number): number {
  return width * length;
}

export function occupancyPct(usedArea: number, capArea: number, fullUnitArea?: number): number {
  if (capArea <= 0) return 0;
  // A bin that has no room left for even one more unit (a standard pallet) is
  // effectively full — show 100% even if pallets don't perfectly tile the floor
  // area (e.g. two 0.96 m² pallets in a 2.1 m² bin = 91% by area, but full).
  if (fullUnitArea != null && usedArea > 0 && capArea - usedArea < fullUnitArea) return 100;
  return Math.min(100, (usedArea / capArea) * 100);
}

export type BinTone = "empty" | "qc" | "expired" | "full" | "near" | "ok";

export function binStatusTone(opts: {
  empty: boolean;
  hasQcHold: boolean;
  hasExpired: boolean;
  pctOccupied: number;
}): BinTone {
  if (opts.empty) return "empty";
  if (opts.hasQcHold) return "qc";
  if (opts.hasExpired) return "expired";
  if (opts.pctOccupied >= 95) return "full";
  if (opts.pctOccupied >= 80) return "near";
  return "ok";
}

export type BarTone = "red" | "amber" | "green";

export function occupancyBarTone(pct: number): BarTone {
  if (pct >= 85) return "red";
  if (pct >= 70) return "amber";
  return "green";
}

export const BAR_TONE_COLOR: Record<BarTone, string> = {
  red: "#d24141",
  amber: "#e59a2b",
  green: "#12b5d4",
};
