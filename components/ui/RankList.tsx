import { Money } from "@/components/ui/Currency";

export const RANK_COLORS = [
  "#6c5ce7", "#12b5d4", "#22c58e", "#f7a63b", "#ff6b5c",
  "#4b8df8", "#a06bef", "#f0568f", "#0fb5a8", "#94a3b8",
];

export type RankItem = { label: string; sub?: string; value: number; barPct: number };

/** Top-N ranked list with a colored number badge and a thin progress bar. */
export function RankList({ items }: { items: RankItem[] }) {
  if (items.length === 0) {
    return <div className="py-6 text-center text-[12.5px] text-[#9aa4b4]">No data for this period</div>;
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => {
        const c = RANK_COLORS[i % RANK_COLORS.length];
        return (
          <div
            key={i}
            title={`#${i + 1} ${it.label} · ฿${Math.round(it.value).toLocaleString()}${it.sub ? " · " + it.sub : ""}`}
            className="flex items-center gap-3"
          >
            <span
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: c }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12.5px] font-medium text-[#2a3444]">{it.label}</span>
                <span className="font-num flex-none text-[12.5px] font-bold text-[#16202e]">
                  <Money value={it.value} />
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef1f5]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(3, it.barPct)}%`, background: c }} />
                </div>
                {it.sub != null && (
                  <span className="font-num flex-none text-[10.5px] text-[#9aa4b4]">{it.sub}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
