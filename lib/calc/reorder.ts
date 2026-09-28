// Min/Max (reorder point / stock ceiling) status for a product.
// A level of 0 means "not set".
export type ReorderStatus = "low" | "over" | "ok" | "none";

// Auto reorder levels, derived from real usage (issued) + receiving history.
// Recomputed on every read so the numbers stay current.
export const USAGE_WINDOW_DAYS = 90; // history window used to average usage
export const LEAD_TIME_DAYS = 7; // assumed days to receive after ordering
export const SAFETY_DAYS = 7; // extra buffer

/**
 * avgDailyUse = units issued/day; avgReceiptQty = typical delivery size.
 * packSize (pallet size) rounds every level UP to a whole pack — no fractional
 * packs, so the numbers are practical to order.
 */
export function autoLevels(
  avgDailyUse: number,
  avgReceiptQty: number,
  packSize = 0
): { autoMin: number; autoMax: number; safety: number } {
  if (avgDailyUse <= 0) return { autoMin: 0, autoMax: 0, safety: 0 };
  const r = (v: number) => (packSize > 0 ? Math.ceil(v / packSize) * packSize : Math.ceil(v));
  const safety = r(avgDailyUse * SAFETY_DAYS); // buffer stock
  const autoMin = r(avgDailyUse * (LEAD_TIME_DAYS + SAFETY_DAYS)); // reorder point
  // reorder up to one typical delivery above min, but at least ~6 weeks of cover
  const autoMax = r(Math.max(autoMin + avgReceiptQty, avgDailyUse * 45));
  return { autoMin, autoMax, safety };
}

/** Manual value wins when set (>0); otherwise fall back to the auto value. */
export function effectiveLevels(manualMin: number, manualMax: number, autoMin: number, autoMax: number) {
  return {
    min: manualMin > 0 ? manualMin : autoMin,
    max: manualMax > 0 ? manualMax : autoMax,
    minAuto: !(manualMin > 0) && autoMin > 0,
    maxAuto: !(manualMax > 0) && autoMax > 0,
  };
}

export function reorderStatus(onHand: number, minQty: number, maxQty: number): ReorderStatus {
  if (minQty <= 0 && maxQty <= 0) return "none";
  if (minQty > 0 && onHand < minQty) return "low";
  if (maxQty > 0 && onHand > maxQty) return "over";
  return "ok";
}

export const REORDER_LABEL: Record<ReorderStatus, string> = {
  low: "Low · ต่ำกว่า Min",
  over: "Over · เกิน Max",
  ok: "OK · ปกติ",
  none: "—",
};

export const REORDER_COLOR: Record<ReorderStatus, { bg: string; text: string }> = {
  low: { bg: "#fbe9e9", text: "#c53f3f" },
  over: { bg: "#fff2df", text: "#b5790f" },
  ok: { bg: "#e4f4f8", text: "#0e8ea6" },
  none: { bg: "#eef1f5", text: "#9aa4b4" },
};
