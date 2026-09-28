import { daysBetween, fmtDateBE } from "./date";

/** Age-since-received buckets — final version (0-30/31-60/61-90/90+ was an earlier, superseded scheme). */
export const AGE_BUCKETS = [
  { label: "0–60", color: "#1f66a6" },
  { label: "61–120", color: "#2f86cf" },
  { label: "121–180", color: "#e59a2b" },
  { label: "181–240", color: "#d24141" },
] as const;

export function ageBucketIndex(ageDays: number): number {
  if (ageDays <= 60) return 0;
  if (ageDays <= 120) return 1;
  if (ageDays <= 180) return 2;
  return 3;
}

/** Time-to-expiry value buckets — fixed thresholds, independent of the page's editable near-expiry threshold. */
export const EXPIRY_BUCKETS = [
  { label: "Expired", color: "#d24141" },
  { label: "≤30d", color: "#e08a2b" },
  { label: "31–90d", color: "#e5b93a" },
  { label: "91–180d", color: "#2fc98d" },
  { label: ">180d / none", color: "#16b37e" },
] as const;

export function expiryBucketIndex(daysToExpiry: number | null): number {
  if (daysToExpiry === null) return 4;
  if (daysToExpiry < 0) return 0;
  if (daysToExpiry <= 30) return 1;
  if (daysToExpiry <= 90) return 2;
  if (daysToExpiry <= 180) return 3;
  return 4;
}

export type ExpKind = "none" | "expired" | "near" | "ok";

export type ExpInfo = {
  kind: ExpKind;
  label: string;
  daysLeft: number | null;
};

/** Badge classification used on Aging/Issue/Product rows. `thresholdDays` is the page's editable near-expiry setting. */
export function expiryInfo(
  expDate: Date | null,
  today: Date,
  thresholdDays: number
): ExpInfo {
  if (!expDate) return { kind: "none", label: "— none —", daysLeft: null };
  const daysLeft = daysBetween(expDate, today);
  if (daysLeft < 0) {
    return {
      kind: "expired",
      label: `Expired ${fmtDateBE(expDate)}`,
      daysLeft,
    };
  }
  if (daysLeft <= thresholdDays) {
    return {
      kind: "near",
      label: `${fmtDateBE(expDate)} · ${daysLeft}d`,
      daysLeft,
    };
  }
  return { kind: "ok", label: fmtDateBE(expDate), daysLeft };
}
