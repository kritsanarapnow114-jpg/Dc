const BE_OFFSET = 543;
const BANGKOK_OFFSET_MS = 7 * 3600 * 1000;

/**
 * "Today" as a UTC-midnight Date matching the Bangkok (UTC+7) calendar day.
 * Server `new Date()` returns UTC time, but docDate values are stored as
 * UTC-midnight of the date string entered in the (Thai) browser — so
 * comparing against a raw `new Date()` skews the boundary during
 * 00:00–06:59 ICT, when the UTC calendar day is still "yesterday".
 */
export function todayBangkok(): Date {
  const shifted = new Date(Date.now() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function beYear(d: Date): number {
  return d.getFullYear() + BE_OFFSET;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Display date as dd/mm/yyyy in the Christian era (ค.ศ.), e.g. 05/07/2026.
 *  (Name kept for its many call sites; document numbers still use beYear.) */
export function fmtDateBE(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** yyyy-mm-dd for <input type="date"> */
export function fmtDateISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetween(later: Date, earlier: Date): number {
  const a = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const b = Date.UTC(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate()
  );
  return Math.floor((a - b) / 86400000);
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function parseISO(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

/** Parse a date input (yyyy-mm-dd / ISO) defensively. Returns null for an empty,
 *  unparseable, or out-of-range value — e.g. a fat-fingered 5-digit year like
 *  "20230-08-22", which would otherwise reach Prisma as an un-serializable
 *  DateTime and crash the whole mutation. Keeps a generous 1970–2200 window. */
export function safeInputDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1970 || y > 2200) return null;
  return d;
}

/** True when a non-empty date input can't be parsed to a sane, in-range date. */
export function isBadDateInput(s: string | null | undefined): boolean {
  return !!s && safeInputDate(s) === null;
}

