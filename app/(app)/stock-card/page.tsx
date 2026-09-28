import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { MOVEMENT_TYPE_TONE } from "@/components/ui/tone";
import { resolvePeriod } from "@/lib/calc/period";
import { fmtDateBE } from "@/lib/calc/date";
import { buildStockCard } from "@/lib/calc/stockCard";
import { getReportProductOptions } from "@/lib/views/reports";
import { ProductPicker } from "./ProductPicker";

export default async function StockCardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; mode?: string; date?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const { mode, range, dateStr, startStr, endStr } = resolvePeriod(params);
  const products = await getReportProductOptions();
  const code = products.some((p) => p.code === params.code) ? params.code! : products[0]?.code ?? "";
  const product = products.find((p) => p.code === code);

  const entries = code ? await buildStockCard(code) : [];
  const startT = range.start.getTime();
  const endT = range.end.getTime() + 86400000; // end date is inclusive
  const before = entries.filter((e) => e.date.getTime() < startT);
  const rows = entries.filter((e) => e.date.getTime() >= startT && e.date.getTime() < endT);
  const opening = before.length ? before[before.length - 1].balance : 0;
  const totalIn = rows.reduce((s, r) => s + r.in, 0);
  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  const closing = opening + totalIn - totalOut;

  return (
    <div className="max-w-[1280px] p-[24px_26px]">
      <PeriodSelector
        basePath="/stock-card"
        mode={mode}
        date={dateStr}
        start={startStr}
        end={endStr}
        keep={code ? { code } : undefined}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[12.5px] font-medium text-[#3a4658]">สินค้า (Product)</div>
          <div className="min-w-[260px] flex-1">
            <ProductPicker products={products} code={code} />
          </div>
          {code && (
            <a
              href={`/api/export/stock-card/${encodeURIComponent(code)}`}
              className="flex items-center gap-1.5 rounded-[8px] border border-[#9fd3b5] bg-[#eaf6ef] px-3.5 py-2 text-[12.5px] font-semibold text-[#1b7a48]"
            >
              ⤓ Export Excel
            </a>
          )}
        </div>
      </Card>

      {!product ? (
        <Card>
          <div className="py-8 text-center text-[13px] text-[#9aa4b4]">ยังไม่มีสินค้า (no products yet)</div>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Summary label="ยอดยกมา (Opening)" value={opening} />
            <Summary label="รับเข้า (In)" value={totalIn} color="#1b7a48" sign="+" />
            <Summary label="จ่ายออก (Out)" value={totalOut} color="#c53f3f" sign="−" />
            <Summary label="คงเหลือ (Closing)" value={closing} strong />
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f7f9fb] text-left text-[12px] text-[#69748a]">
                  <th className="px-4 py-2.5 font-medium">Date (วันที่)</th>
                  <th className="px-4 py-2.5 font-medium">Doc No. (เลขเอกสาร)</th>
                  <th className="px-4 py-2.5 font-medium">Type (ประเภท)</th>
                  <th className="px-4 py-2.5 font-medium">Lot</th>
                  <th className="px-4 py-2.5 text-right font-medium">In (รับ)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Out (จ่าย)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Balance (คงเหลือ)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#eef1f5] bg-[#fafbfc] text-[#69748a]">
                  <td className="px-4 py-2 text-[12px]" colSpan={6}>
                    ยอดยกมา (Opening balance)
                  </td>
                  <td className="font-num px-4 py-2 text-right font-semibold">{opening.toLocaleString()}</td>
                </tr>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-[#eef1f5]">
                    <td className="font-num px-4 py-2 text-[12px]">{fmtDateBE(r.date)}</td>
                    <td className="font-num px-4 py-2 text-[12px]">{r.doc}</td>
                    <td className="px-4 py-2">
                      <Badge tone={MOVEMENT_TYPE_TONE[r.type] ?? "neutral"}>{r.type}</Badge>
                    </td>
                    <td className="font-num px-4 py-2 text-[12px]">{r.lot}</td>
                    <td className="font-num px-4 py-2 text-right text-[#1b7a48]">
                      {r.in > 0 ? `+${r.in.toLocaleString()}` : ""}
                    </td>
                    <td className="font-num px-4 py-2 text-right text-[#c53f3f]">
                      {r.out > 0 ? `−${r.out.toLocaleString()}` : ""}
                    </td>
                    <td className="font-num px-4 py-2 text-right font-semibold">{r.balance.toLocaleString()}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr className="border-t border-[#eef1f5]">
                    <td colSpan={7} className="px-4 py-8 text-center text-[#9aa4b4]">
                      ไม่มีความเคลื่อนไหวในช่วงนี้ (no movements in the selected period)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  color = "#16202e",
  sign = "",
  strong,
}: {
  label: string;
  value: number;
  color?: string;
  sign?: string;
  strong?: boolean;
}) {
  return (
    <Card>
      <div className="mb-1.5 text-[12px] text-[#69748a]">{label}</div>
      <div className={`font-num tracking-tight ${strong ? "text-[26px] font-bold" : "text-[22px] font-semibold"}`} style={{ color: value > 0 ? color : "#16202e" }}>
        {value > 0 && sign ? sign : ""}
        {value.toLocaleString()}
      </div>
    </Card>
  );
}
