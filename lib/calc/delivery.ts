import { daysBetween } from "@/lib/calc/date";

/** How a ship order stands against its due date (กำหนดส่ง).
 *  - on-time / late: fully shipped; `days` = days late (0 when on time)
 *  - overdue: still open past the due date; `days` = days past due
 *  - due-today / due-soon (≤2 days) / open: still open; `days` = days left */
export type DeliveryKind = "none" | "on-time" | "late" | "overdue" | "due-today" | "due-soon" | "open";
export type DeliveryState = { kind: DeliveryKind; days: number };

export const DUE_SOON_DAYS = 2;

export function deliveryState(
  due: Date | null,
  completedAt: Date | null,
  today: Date
): DeliveryState {
  if (!due) return { kind: "none", days: 0 };
  if (completedAt) {
    const late = daysBetween(completedAt, due);
    return late > 0 ? { kind: "late", days: late } : { kind: "on-time", days: 0 };
  }
  const left = daysBetween(due, today);
  if (left < 0) return { kind: "overdue", days: -left };
  if (left === 0) return { kind: "due-today", days: 0 };
  if (left <= DUE_SOON_DAYS) return { kind: "due-soon", days: left };
  return { kind: "open", days: left };
}

/** When a ship order finished shipping: the latest non-reversed shipment. */
export function completedAtOf(
  status: string,
  shipments: { date: Date; reversed: boolean }[]
): Date | null {
  if (status !== "COMPLETE") return null;
  const dates = shipments.filter((s) => !s.reversed).map((s) => s.date.getTime());
  return dates.length ? new Date(Math.max(...dates)) : null;
}
