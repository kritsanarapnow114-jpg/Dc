import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { LateOrder } from "@/lib/views/dashboard";

type Delivery = {
  onTime: number;
  late: number;
  shipped: number;
  onTimePct: number | null;
  avgLateDays: number;
  overdue: LateOrder[];
  lateShipped: LateOrder[];
  dueToday: number;
  dueSoon: number;
};

/** On-time delivery (การส่งตรงเวลา) — ship orders against their due date. */
export function DeliveryCard({ data }: { data: Delivery }) {
  const pct = data.onTimePct;
  const pctColor = pct === null ? "#9aa4b4" : pct >= 95 ? "#1b7a48" : pct >= 80 ? "#b5790f" : "#c53f3f";

  return (
    <Card className="mb-4">
      <div className="mb-3.5 flex items-baseline">
        <div className="flex-1 text-[14px] font-semibold">On-time Delivery (การส่งตรงกำหนด)</div>
        <Link href="/ship" className="text-[12px] text-[#d71f28]">
          Ship Orders →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2 rounded-[10px] border border-[#e7ebf1] bg-[#f7f9fb] p-3.5">
            <div className="text-[11.5px] text-[#69748a]">ส่งตรงเวลา (ช่วงที่เลือก)</div>
            <div className="font-num text-[30px] font-bold leading-tight" style={{ color: pctColor }}>
              {pct === null ? "—" : `${pct.toFixed(1)}%`}
            </div>
            <div className="text-[11.5px] text-[#69748a]">
              {data.onTime}/{data.shipped} ออเดอร์ส่งครบตรงกำหนด
            </div>
          </div>
          <Stat label="ส่งช้า (ส่งแล้ว)" value={data.late} sub={data.late ? `เฉลี่ยช้า ${data.avgLateDays.toFixed(1)} วัน` : "—"} color="#c53f3f" />
          <Stat label="เลยกำหนด (ยังไม่ส่ง)" value={data.overdue.length} sub="ค้างส่ง" color="#c53f3f" />
          <Stat label="ครบกำหนดวันนี้" value={data.dueToday} sub="ต้องส่งวันนี้" color="#b5790f" />
          <Stat label="ใกล้ครบกำหนด" value={data.dueSoon} sub="ภายใน 2 วัน" color="#b5790f" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LateList title="เลยกำหนด ยังไม่ส่ง (Overdue)" rows={data.overdue} empty="ไม่มีออเดอร์ค้างส่ง 👍" suffix="เลย" />
          <LateList title="ส่งช้ากว่ากำหนด (Shipped late)" rows={data.lateShipped} empty="ไม่มีออเดอร์ส่งช้าในช่วงนี้" suffix="ช้า" />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-[#e7ebf1] p-3">
      <div className="text-[11.5px] text-[#69748a]">{label}</div>
      <div className="font-num text-[22px] font-bold" style={{ color: value > 0 ? color : "#16202e" }}>
        {value}
      </div>
      <div className="text-[11px] text-[#9aa4b4]">{sub}</div>
    </div>
  );
}

function LateList({ title, rows, empty, suffix }: { title: string; rows: LateOrder[]; empty: string; suffix: string }) {
  return (
    <div>
      <div className="mb-2 text-[12.5px] font-semibold text-[#3a4658]">{title}</div>
      {rows.length === 0 ? (
        <div className="rounded-[10px] bg-[#f7f9fb] px-3 py-6 text-center text-[12px] text-[#9aa4b4]">{empty}</div>
      ) : (
        <div className="flex flex-col divide-y divide-[#eef1f5]">
          {rows.slice(0, 6).map((o) => (
            <div key={o.no} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-num text-[12px] text-[#3a4658]">{o.no}</div>
                <div className="truncate text-[11.5px] text-[#69748a]">
                  {o.customer} · กำหนด <span className="font-num">{o.due}</span>
                </div>
              </div>
              <span className="flex-none rounded-full bg-[#fbe9e9] px-2 py-0.5 text-[11.5px] font-semibold text-[#c53f3f]">
                {suffix} {o.daysLate} วัน
              </span>
            </div>
          ))}
          {rows.length > 6 && (
            <div className="pt-2 text-[11.5px] text-[#9aa4b4]">+{rows.length - 6} more</div>
          )}
        </div>
      )}
    </div>
  );
}
