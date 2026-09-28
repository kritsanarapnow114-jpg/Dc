import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Currency";
import { fmtDateISO } from "@/lib/calc/date";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { resolvePeriod } from "@/lib/calc/period";
import { getReportData, getReportProductOptions } from "@/lib/views/reports";
import { ReportsStockCard } from "./ReportsStockCard";
import { ReportRunner } from "./ReportRunner";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; date?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const { mode, range, dateStr, startStr, endStr } = resolvePeriod(params);

  const [data, products] = await Promise.all([getReportData(range), getReportProductOptions()]);

  return (
    <div className="max-w-[1280px] p-[24px_26px]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PeriodSelector basePath="/reports" mode={mode} date={dateStr} start={startStr} end={endStr} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Received (รับเข้า)</div>
          <div className="font-num text-[24px] font-bold tracking-tight text-[#a8121c]">
            {data.receiving.totalUnits.toLocaleString()}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">{data.receiving.docCount} docs</div>
        </Card>
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Issued (จ่ายออก)</div>
          <div className="font-num text-[24px] font-bold tracking-tight text-[#c9821f]">
            {data.issuing.totalUnits.toLocaleString()}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">{data.issuing.docCount} docs</div>
        </Card>
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Loss value (มูลค่าสูญเสีย)</div>
          <div className="font-num text-[24px] font-bold tracking-tight text-[#d24141]">
            <Money value={data.loss.totalValue} />
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">{data.loss.totalQty.toLocaleString()} units short</div>
        </Card>
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Customer returns (รับคืน)</div>
          <div className="font-num text-[24px] font-bold tracking-tight text-[#bd6f12]">
            {data.returns.totalUnits.toLocaleString()}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">{data.returns.docCount} docs</div>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Purchase Orders (PO)</div>
          <div className="font-num text-[20px] font-bold tracking-tight">{data.po.docCount}</div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">
            {data.po.totalReceived.toLocaleString()} / {data.po.totalOrdered.toLocaleString()} received
          </div>
        </Card>
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Transfers (ย้ายที่เก็บ)</div>
          <div className="font-num text-[20px] font-bold tracking-tight">{data.transfer.totalUnits.toLocaleString()}</div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">{data.transfer.docCount} docs</div>
        </Card>
        <Card>
          <div className="mb-2 text-[12px] text-[#69748a]">Stock Count accuracy (นับสต็อก)</div>
          <div className="font-num text-[20px] font-bold tracking-tight text-[#d71f28]">
            {data.count.accuracyPct.toFixed(1)}%
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#9aa4b4]">{data.count.docCount} docs · {data.count.lineCount} lines</div>
        </Card>
      </div>

      <ReportRunner start={fmtDateISO(range.start)} end={fmtDateISO(range.end)} />

      {products.length > 0 && (
        <ReportsStockCard
          products={products}
          start={fmtDateISO(range.start)}
          end={fmtDateISO(range.end)}
        />
      )}
    </div>
  );
}
