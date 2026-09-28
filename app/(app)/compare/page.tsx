import { getPeriodComparison, CompareMetric, MoverRow, VendorRow } from "@/lib/views/compare";
import { todayBangkok, parseISO, fmtDateISO, fmtDateBE } from "@/lib/calc/date";
import { Money } from "@/components/ui/Currency";
import { ComparePeriods as ComparePeriodsClient } from "./ComparePeriods";
import { MovementCompare } from "./CompareCharts";

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ aStart?: string; aEnd?: string; bStart?: string; bEnd?: string }>;
}) {
  const p = await searchParams;
  const today = todayBangkok();
  const aEnd = p.aEnd ? parseISO(p.aEnd) : today;
  const aStart = p.aStart ? parseISO(p.aStart) : addDays(today, -29);
  const bEnd = p.bEnd ? parseISO(p.bEnd) : addDays(aStart, -1);
  const bStart = p.bStart ? parseISO(p.bStart) : addDays(bEnd, -29);

  const cmp = await getPeriodComparison({ start: aStart, end: aEnd }, { start: bStart, end: bEnd });

  const labelA = `${fmtDateBE(aStart)} – ${fmtDateBE(aEnd)}`;
  const labelB = `${fmtDateBE(bStart)} – ${fmtDateBE(bEnd)}`;

  return (
    <div className="max-w-[1180px] p-[22px_26px]">
      <ComparePeriodsClient
        aStart={fmtDateISO(aStart)}
        aEnd={fmtDateISO(aEnd)}
        bStart={fmtDateISO(bStart)}
        bEnd={fmtDateISO(bEnd)}
      />

      <div className="mb-3 mt-4 flex flex-wrap gap-4 text-[12px]">
        <span className="flex items-center gap-1.5 font-semibold text-[#2f86cf]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2f86cf]" /> A · {labelA}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-[#8a94a6]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8a94a6]" /> B · {labelB}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cmp.metrics.map((m) => (
          <MetricCard key={m.key} m={m} />
        ))}
      </div>

      <div className="mt-5">
        <MovementCompare a={cmp.movement.a} b={cmp.movement.b} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MoverPanel title="รับเข้าสูงสุด · Top received" a={cmp.receivedTop.a} b={cmp.receivedTop.b} accent="#1f66a6" />
        <MoverPanel title="จ่ายออกสูงสุด · Top issued" a={cmp.issuedTop.a} b={cmp.issuedTop.b} accent="#c9821f" />
      </div>

      <div className="mt-4">
        <VendorPanel a={cmp.vendors.a} b={cmp.vendors.b} />
      </div>
    </div>
  );
}

function pctChange(a: number, b: number): number | null {
  if (b === 0) return a === 0 ? 0 : null; // null = no baseline (new)
  return ((a - b) / Math.abs(b)) * 100;
}

function MetricCard({ m }: { m: CompareMetric }) {
  const pc = pctChange(m.a, m.b);
  const up = m.a > m.b;
  const same = m.a === m.b;
  // colour: good change green, bad change red (loss inverts)
  const good = same ? null : m.goodUp ? up : !up;
  const color = good === null ? "#8a94a6" : good ? "#1f9d63" : "#d24141";
  const arrow = same ? "＝" : up ? "▲" : "▼";
  const val = (v: number) =>
    m.money ? <Money value={v} /> : <span>{Math.round(v).toLocaleString()}</span>;
  const mx = Math.max(Math.abs(m.a), Math.abs(m.b), 1);
  const aw = (Math.abs(m.a) / mx) * 100;
  const bw = (Math.abs(m.b) / mx) * 100;

  return (
    <div className="rounded-[13px] border border-[#e7ebf1] bg-white p-4 shadow-[0_1px_2px_rgba(20,30,48,.04)]">
      <div className="text-[12px] font-medium text-[#69748a]">{m.th}</div>
      <div className="font-num mt-1.5 text-[22px] font-bold text-[#16202e]">{val(m.a)}</div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="font-num text-[11.5px] text-[#9aa4b4]">B: {val(m.b)}</span>
        <span className="font-num text-[12px] font-bold" style={{ color }}>
          {arrow} {pc === null ? "ใหม่" : `${pc >= 0 ? "+" : ""}${pc.toFixed(0)}%`}
        </span>
      </div>
      {/* A vs B mini bars */}
      <div className="mt-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 text-[9px] font-bold text-[#2f86cf]">A</span>
          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
            <div className="h-full rounded-full bg-[#2f86cf]" style={{ width: `${aw}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 text-[9px] font-bold text-[#8a94a6]">B</span>
          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
            <div className="h-full rounded-full bg-[#8a94a6]" style={{ width: `${bw}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoverPanel({ title, a, b, accent }: { title: string; a: MoverRow[]; b: MoverRow[]; accent: string }) {
  const bByCode = new Map(b.map((r) => [r.code, r.qty]));
  return (
    <div className="rounded-[13px] border border-[#e7ebf1] bg-white p-4">
      <div className="mb-2.5 text-[13px] font-bold" style={{ color: accent }}>{title}</div>
      {a.length === 0 ? (
        <div className="py-4 text-center text-[12px] text-[#9aa4b4]">ไม่มีข้อมูลในช่วง A</div>
      ) : (
        <div className="flex flex-col gap-2">
          {a.map((r) => {
            const bq = bByCode.get(r.code) ?? 0;
            const pc = pctChange(r.qty, bq);
            return (
              <div key={r.code} className="flex items-center gap-2 text-[12.5px]">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[#16202e]">{r.name}</div>
                  <div className="font-num text-[11px] text-[#9aa4b4]">{r.code}</div>
                </div>
                <div className="font-num text-right">
                  <div className="font-semibold text-[#16202e]">{Math.round(r.qty).toLocaleString()}</div>
                  <div className="text-[11px] text-[#9aa4b4]">B: {Math.round(bq).toLocaleString()}</div>
                </div>
                <span
                  className="font-num w-[52px] flex-none text-right text-[11.5px] font-bold"
                  style={{ color: pc === null ? "#8a94a6" : pc >= 0 ? "#1f9d63" : "#d24141" }}
                >
                  {pc === null ? "ใหม่" : `${pc >= 0 ? "+" : ""}${pc.toFixed(0)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VendorPanel({ a, b }: { a: VendorRow[]; b: VendorRow[] }) {
  const bByName = new Map(b.map((r) => [r.name, r.value]));
  return (
    <div className="rounded-[13px] border border-[#e7ebf1] bg-white p-4">
      <div className="mb-2.5 text-[13px] font-bold text-[#7b6ef0]">คู่ค้าสูงสุด (มูลค่ารับเข้า) · Top vendors</div>
      {a.length === 0 ? (
        <div className="py-4 text-center text-[12px] text-[#9aa4b4]">ไม่มีข้อมูลในช่วง A</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {a.map((r) => {
            const bv = bByName.get(r.name) ?? 0;
            const pc = pctChange(r.value, bv);
            return (
              <div key={r.name} className="flex items-center gap-2 rounded-[10px] border border-[#eef1f5] px-3 py-2 text-[12.5px]">
                <div className="min-w-0 flex-1 truncate font-medium text-[#16202e]">{r.name}</div>
                <div className="font-num text-right">
                  <div className="font-semibold"><Money value={r.value} /></div>
                  <div className="text-[11px] text-[#9aa4b4]">B: <Money value={bv} /></div>
                </div>
                <span
                  className="font-num w-[52px] flex-none text-right text-[11.5px] font-bold"
                  style={{ color: pc === null ? "#8a94a6" : pc >= 0 ? "#1f9d63" : "#d24141" }}
                >
                  {pc === null ? "ใหม่" : `${pc >= 0 ? "+" : ""}${pc.toFixed(0)}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
