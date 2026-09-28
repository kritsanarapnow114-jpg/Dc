import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Money } from "@/components/ui/Currency";
import { buttonClass } from "@/components/ui/Button";
import { getAgeBuckets, getExpiryBuckets, getAgingRows } from "@/lib/views/aging";
import { getShelfLifeRows } from "@/lib/views/shelfLife";
import { todayBangkok } from "@/lib/calc/date";
import { ThresholdInput } from "./ThresholdInput";
import { AgingTable } from "./AgingTable";
import { ShelfLifeChart } from "./ShelfLifeChart";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "near", label: "Expiring (near)" },
  { value: "expired", label: "Expired" },
] as const;

export default async function AgingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; threshold?: string }>;
}) {
  const { filter, threshold } = await searchParams;
  const today = todayBangkok();
  const thresholdDays = threshold ? Number(threshold) || 30 : 30;
  const filterValue: "all" | "near" | "expired" =
    filter === "near" || filter === "expired" ? filter : "all";

  const [ageBuckets, expiryBuckets, rows, shelfLifeRows] = await Promise.all([
    getAgeBuckets(today),
    getExpiryBuckets(today),
    getAgingRows({ filter: filterValue, thresholdDays, today }),
    getShelfLifeRows(today),
  ]);

  const maxAgeValue = Math.max(1, ...ageBuckets.map((b) => b.value));

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (filterValue !== "all") p.set("filter", filterValue);
    if (thresholdDays !== 30) p.set("threshold", String(thresholdDays));
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="max-w-[1280px] p-[22px_26px]">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ageBuckets.map((b) => (
          <Card key={b.label}>
            <div className="mb-2 flex items-center gap-2 text-[12px] text-[#69748a]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
              Age {b.label} days
            </div>
            <div className="font-num text-[27px] font-bold tracking-tight">
              <Money value={b.value} />
            </div>
            <div className="mb-2.5 mt-1.5 text-[11.5px] text-[#9aa4b4]">
              {b.count} lots
            </div>
            <ProgressBar pct={(b.value / maxAgeValue) * 100} color={b.color} height={7} />
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <div className="mb-3.5 flex flex-wrap items-baseline gap-3">
          <div className="flex-1 text-[14px] font-semibold">
            Value by Time-to-Expiry (มูลค่าตามอายุที่เหลือ)
          </div>
          <div className="text-[12px] text-[#69748a]">
            At risk ≤90d (เสี่ยงหมดอายุ):{" "}
            <b className="font-num text-[#d24141]">
              <Money value={expiryBuckets.atRiskValue} />
            </b>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {expiryBuckets.buckets.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <div className="flex w-[120px] flex-none items-center gap-2 text-[12.5px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                <span>{b.label}</span>
              </div>
              <div className="h-[13px] flex-1 overflow-hidden rounded-[5px] bg-[#f1f3f7]">
                <div
                  className="h-full rounded-[5px]"
                  style={{ width: `${b.pct}%`, background: b.color }}
                />
              </div>
              <div className="font-num w-[60px] text-right text-[11px] text-[#9aa4b4]">
                {b.count} lots
              </div>
              <div className="font-num w-[112px] text-right text-[12.5px] font-semibold">
                <Money value={b.value} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <ShelfLifeChart rows={shelfLifeRows} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {FILTERS.map((f) => {
          const active = filterValue === f.value;
          return (
            <Link
              key={f.value}
              href={`/aging${qs({ filter: f.value === "all" ? "" : f.value })}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                active
                  ? "bg-[#2f86cf] text-white"
                  : "border border-[#e2e6ec] bg-white text-[#3a4658]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        <ThresholdInput filter={filterValue} threshold={thresholdDays} />
        <div className="flex-1" />
        <a
          href={`/api/export/aging${qs({})}`}
          className={buttonClass("success")}
        >
          ⤓ Export Excel
        </a>
      </div>

      <AgingTable rows={rows} />
    </div>
  );
}
