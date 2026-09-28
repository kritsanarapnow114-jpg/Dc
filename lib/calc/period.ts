import { todayBangkok, parseISO, fmtDateISO } from "./date";
import { Range } from "@/lib/views/dashboard";
import { PeriodMode } from "@/components/ui/PeriodSelector";

/** Well before any conceivable real business data — stands in for "no lower bound". */
const ALL_TIME_START = new Date(Date.UTC(2000, 0, 1));

export type ResolvedPeriod = {
  mode: PeriodMode;
  range: Range;
  dateStr: string;
  startStr: string;
  endStr: string;
};

export function resolvePeriod(
  params: { mode?: string; date?: string; start?: string; end?: string },
  defaultRangeDays = 29
): ResolvedPeriod {
  const today = todayBangkok();
  const mode: PeriodMode = params.mode === "all" || params.mode === "date" ? params.mode : "range";

  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - defaultRangeDays);

  if (mode === "all") {
    return {
      mode,
      range: { start: ALL_TIME_START, end: today },
      dateStr: fmtDateISO(today),
      startStr: fmtDateISO(defaultStart),
      endStr: fmtDateISO(today),
    };
  }

  if (mode === "date") {
    const d = params.date ? parseISO(params.date) : today;
    return {
      mode,
      range: { start: d, end: d },
      dateStr: fmtDateISO(d),
      startStr: fmtDateISO(defaultStart),
      endStr: fmtDateISO(today),
    };
  }

  const start = params.start ? parseISO(params.start) : defaultStart;
  const end = params.end ? parseISO(params.end) : today;
  return {
    mode,
    range: { start, end },
    dateStr: fmtDateISO(end),
    startStr: fmtDateISO(start),
    endStr: fmtDateISO(end),
  };
}
