import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Money } from "@/components/ui/Currency";
import { DonutChart } from "@/components/ui/DonutChart";
import { RankList } from "@/components/ui/RankList";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { resolvePeriod } from "@/lib/calc/period";
import { kpiBand } from "@/lib/calc/kpi";
import {
  getInventoryStats,
  getStorageUtilization,
  getValueByCategory,
  getValueByExpiry,
  getMovementDetail,
  getSlowMoving,
  getCountProgress,
  getMovementBuckets,
  getActionRequired,
  getTopProductsByValue,
  getTopVendors,
} from "@/lib/views/dashboard";
import { KpiBand } from "./KpiBand";
import { MovementChart } from "./MovementChart";
import { SlowMovingCard } from "./SlowMovingCard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; date?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const { mode, range, dateStr, startStr, endStr } = resolvePeriod(params);

  const [
    kpis,
    stats,
    storage,
    valueByCategory,
    valueByExpiry,
    movementDetail,
    slowMoving,
    countProgress,
    movementBuckets,
    actionRequired,
    topProducts,
    topVendors,
  ] = await Promise.all([
    kpiBand(range),
    getInventoryStats(range),
    getStorageUtilization(range.end),
    getValueByCategory(range.end),
    getValueByExpiry(range.end),
    getMovementDetail(range),
    getSlowMoving(range.end),
    getCountProgress(range.end),
    getMovementBuckets(range),
    getActionRequired(range.end),
    getTopProductsByValue(range.end),
    getTopVendors(range),
  ]);
  const categoryTotal = valueByCategory.reduce((s, c) => s + c.value, 0);

  return (
    <div className="max-w-[1280px] p-[24px_26px]">
      <PeriodSelector basePath="/dashboard" mode={mode} date={dateStr} start={startStr} end={endStr} />

      <KpiBand kpis={kpis} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="◈"
          hue="#2f86cf"
          label="Inventory Value (มูลค่าคงเหลือ)"
          value={<Money value={stats.inventoryValue} />}
          sub={`${stats.skuCount} SKU · ${stats.lotCount} lots`}
        />
        <StatCard
          icon="↓"
          hue="#1f66a6"
          label="Received in period (รับเข้าช่วงนี้)"
          value={stats.receivedUnits.toLocaleString()}
          valueColor="#1f66a6"
          sub="units received"
        />
        <StatCard
          icon="↑"
          hue="#e59a2b"
          label="Issued in period (จ่ายออกช่วงนี้)"
          value={stats.issuedUnits.toLocaleString()}
          valueColor="#c9821f"
          sub="units issued"
        />
        <StatCard
          icon="✕"
          hue="#d24141"
          label="Loss Value (มูลค่าสูญเสีย)"
          value={<Money value={stats.lossValue} />}
          valueColor="#d24141"
          sub="expired stock · tap to view"
          subColor="#d24141"
          href="/aging?filter=expired"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <MovementChart
            buckets={movementBuckets}
            totalRecv={stats.receivedUnits}
            totalIssue={stats.issuedUnits}
          />
        </Card>
        <Card>
          <CardTitle>Action Required (ต้องดำเนินการ)</CardTitle>
          <div className="flex flex-col gap-2.5">
            {actionRequired.belowMin > 0 && (
              <ActionRow
                icon="↓"
                bg="#fbe9e9"
                border="#f3d2d2"
                text={`${actionRequired.belowMin} สินค้าต่ำกว่า Min (ควรสั่งซื้อ)`}
                sub="Below reorder point"
                subColor="#a34141"
                href="/products"
                cta="Products"
              />
            )}
            <ActionRow
              icon="⚠"
              bg="#fbf1df"
              border="#f2e2c2"
              text={`${actionRequired.qcCount} lots on QC hold (ติด QC)`}
              sub="Unusable until released"
              subColor="#8a7333"
              href="/products"
              cta="Review"
            />
            <ActionRow
              icon="◔"
              bg="#fbe9e9"
              border="#f3d2d2"
              text={`${actionRequired.expCount} lots expiring/expired (หมดอายุ)`}
              sub="Issue or write off soon"
              subColor="#a34141"
              href="/aging"
              cta="Aging"
            />
            <ActionRow
              icon="◷"
              bg="#f1f3f7"
              border="#e2e6ec"
              text={`${actionRequired.overduePOs.length} PO overdue (ค้างรับ)`}
              sub={actionRequired.overduePOs.join(", ") || "—"}
              subColor="#69748a"
              href="/receive"
              cta="Receive"
              mono
            />
          </div>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <div className="mb-1 flex items-baseline">
            <div className="flex-1 text-[14px] font-semibold">
              Storage Utilization (การใช้พื้นที่)
            </div>
            <Link href="/locations" className="text-[12px] text-[#2f86cf]">
              View all →
            </Link>
          </div>
          <div className="mb-3.5 text-[11.5px] text-[#9aa4b4]">
            Total + per-zone (รวม + รายโซน) · by area m²
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1.5 flex justify-between text-[12px] font-semibold">
                <span>Total — all zones (รวมทุกโซน)</span>
                <span className="font-num">{storage.totalPct}%</span>
              </div>
              <ProgressBar pct={storage.totalPct} color={storage.totalColor} />
              <div className="mt-1 text-[10.5px] text-[#9aa4b4]">
                {storage.totalUsed.toLocaleString()} / {storage.totalCap.toLocaleString()} m²
              </div>
            </div>
            {storage.zones.map((z) => (
              <div key={z.name} title={`Zone ${z.name} · ${z.desc}: ${z.pct}% · ${Math.round(z.used).toLocaleString()}/${Math.round(z.cap).toLocaleString()} m²`}>
                <div className="mb-1.5 flex justify-between text-[12px]">
                  <span>
                    Zone {z.name} · {z.desc}
                  </span>
                  <span className="font-num text-[#69748a]">{z.pct}%</span>
                </div>
                <ProgressBar pct={z.pct} color={z.color} height={9} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Value by Category (มูลค่าตามหมวด)</CardTitle>
          <div className="flex items-center gap-5">
            <DonutChart
              data={valueByCategory.map((c) => ({ name: c.name, value: c.value, color: c.color }))}
              prefix="฿"
              center={
                <>
                  <div className="font-num text-[15px] font-bold text-[#16202e]">
                    <Money value={categoryTotal} />
                  </div>
                  <div className="text-[10px] text-[#9aa4b4]">มูลค่ารวม</div>
                </>
              }
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {valueByCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-num flex-none font-semibold text-[#3a4658]">
                    <Money value={c.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <div className="mb-3.5 flex flex-wrap items-baseline gap-3">
          <div className="flex-1 text-[14px] font-semibold">
            Value by Time-to-Expiry (มูลค่าตามอายุที่เหลือ)
          </div>
          <Link href="/aging" className="text-[12px] text-[#2f86cf]">
            View aging →
          </Link>
          <div className="text-[12px] text-[#69748a]">
            At risk ≤90d (เสี่ยงหมดอายุ):{" "}
            <b className="font-num text-[#d24141]">
              <Money value={valueByExpiry.atRiskValue} />
            </b>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {valueByExpiry.buckets.map((b) => (
            <div
              key={b.label}
              title={`${b.label}: ${b.count} lots · ฿${Math.round(b.value).toLocaleString()}`}
              className="flex items-center gap-3"
            >
              <div className="flex w-[120px] flex-none items-center gap-2 text-[12.5px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                <span>{b.label}</span>
              </div>
              <div className="h-[13px] flex-1 overflow-hidden rounded-[5px] bg-[#f1f3f7]">
                <div className="h-full rounded-[5px]" style={{ width: `${b.pct}%`, background: b.color }} />
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

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-1 text-[14px] font-semibold">
            Monthly Count Progress (แผน vs นับจริง รายเดือน)
          </div>
          <div className="mb-4 text-[11.5px] text-[#9aa4b4]">
            Green = counted vs plan (เขียว = นับแล้ว)
          </div>
          <div className="flex flex-col gap-3">
            {countProgress.monthly.map((m) => {
              const donePct = m.plan > 0 ? (m.counted / m.plan) * 100 : 0;
              const pct = Math.min(100, donePct);
              return (
                <div
                  key={m.label}
                  title={`${m.label}: นับ ${m.counted}/${m.plan} · ${(m.plan > 0 ? (m.counted / m.plan) * 100 : 0).toFixed(0)}%`}
                  className="flex items-center gap-2.5"
                >
                  <span className="w-[34px] text-[12px] text-[#69748a]">{m.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-[5px] bg-[#eef1f5]">
                    <div
                      className="h-full rounded-[5px] bg-[#2f86cf]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-num w-28 text-right text-[11.5px] text-[#9aa4b4]">
                    {m.counted}/{m.plan}
                  </span>
                  <span
                    className="font-num w-10 text-right text-[12.5px] font-bold"
                    style={{ color: donePct >= 100 ? "#1f66a6" : "#e59a2b" }}
                  >
                    {donePct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div className="mb-1 text-[14px] font-semibold">
            Weekly Count Progress (แผน vs นับจริง รายอาทิตย์)
          </div>
          <div className="mb-3 text-[11.5px] text-[#9aa4b4]">
            เดือนนี้ · แยกรายสัปดาห์ (current month by week)
          </div>
          {(() => {
            const totCounted = countProgress.weekly.reduce((s, m) => s + m.counted, 0);
            const totPlan = countProgress.weekly.reduce((s, m) => s + m.plan, 0);
            const pct = totPlan > 0 ? (totCounted / totPlan) * 100 : 0;
            return (
              <div className="mb-3 flex items-center gap-3 rounded-[12px] border border-[#e4eef1] bg-gradient-to-r from-[#e8f2fb] to-white p-3">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-[3px] border-[#2f86cf] text-[13px] font-bold text-[#0c7f93]">
                  {pct.toFixed(0)}%
                </div>
                <div className="leading-tight">
                  <div className="font-num text-[18px] font-extrabold text-[#16202e]">
                    {totCounted}/{totPlan}
                  </div>
                  <div className="text-[11px] text-[#69748a]">ล็อตที่นับแล้ว / แผนทั้งเดือน</div>
                </div>
              </div>
            );
          })()}
          <div className="flex flex-col gap-2.5">
            {countProgress.weekly.map((m) => {
              const donePct = m.plan > 0 ? (m.counted / m.plan) * 100 : 0;
              const pct = Math.min(100, donePct);
              return (
                <div
                  key={m.label}
                  title={`${m.label}: นับ ${m.counted}/${m.plan} · ${(m.plan > 0 ? (m.counted / m.plan) * 100 : 0).toFixed(0)}%`}
                  className="flex items-center gap-2.5"
                >
                  <span className="w-[34px] text-[12px] text-[#69748a]">{m.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-[5px] bg-[#eef1f5]">
                    <div
                      className="h-full rounded-[5px]"
                      style={{ width: `${pct}%`, background: donePct >= 100 ? "#2aa775" : "#2f86cf" }}
                    />
                  </div>
                  <span className="font-num w-24 text-right text-[11.5px] text-[#9aa4b4]">
                    {m.counted}/{m.plan}
                  </span>
                  <span
                    className="font-num w-10 text-right text-[12.5px] font-bold"
                    style={{ color: donePct >= 100 ? "#1f66a6" : "#e59a2b" }}
                  >
                    {donePct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-[9px] bg-[#f7f9fb] p-2.5 text-[11px] leading-relaxed text-[#69748a]">
            <b className="text-[#3a4658]">วิธีอ่าน:</b> แผน = จำนวนล็อตที่ตั้งใจจะนับในสัปดาห์นั้น ·
            นับจริง = ล็อตที่ทำเอกสาร Stock Count ไปแล้ว — ตั้งค่าแผนได้ที่หน้า Settings
          </div>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Received in period (รับเข้าอะไรบ้าง)</CardTitle>
          <div className="flex flex-col gap-2.5">
            {movementDetail.received.map((d) => (
              <div key={d.code} className="flex items-center gap-2.5 text-[13px]">
                <span className="font-num w-16 text-[11px] text-[#9aa4b4]">{d.code}</span>
                <span className="flex-1">{d.name}</span>
                <span className="font-num font-semibold text-[#1f66a6]">+{d.qty.toLocaleString()}</span>
              </div>
            ))}
            {movementDetail.received.length === 0 && (
              <div className="text-[12.5px] text-[#9aa4b4]">No receipts this period</div>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Issued in period (จ่ายออกอะไรบ้าง)</CardTitle>
          <div className="flex flex-col gap-2.5">
            {movementDetail.issued.map((d) => (
              <div key={d.code} className="flex items-center gap-2.5 text-[13px]">
                <span className="font-num w-16 text-[11px] text-[#9aa4b4]">{d.code}</span>
                <span className="flex-1">{d.name}</span>
                <span className="font-num font-semibold text-[#c9821f]">−{d.qty.toLocaleString()}</span>
              </div>
            ))}
            {movementDetail.issued.length === 0 && (
              <div className="text-[12.5px] text-[#9aa4b4]">No issues this period</div>
            )}
          </div>
        </Card>
      </div>

      <SlowMovingCard rows={slowMoving} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Top 10 สินค้า · มูลค่าสูงสุด (Products by value)</CardTitle>
          <RankList
            items={topProducts.map((p) => ({
              label: p.name,
              sub: `${p.code} · ${p.share.toFixed(1)}%`,
              value: p.value,
              barPct: p.barPct,
            }))}
          />
        </Card>
        <Card>
          <CardTitle>Top 10 คู่ค้า · Vendors (มูลค่ารับเข้า)</CardTitle>
          <RankList
            items={topVendors.map((v) => ({
              label: v.name,
              sub: `${v.docs} PO · ${v.share.toFixed(1)}%`,
              value: v.value,
              barPct: v.barPct,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  hue,
  label,
  value,
  valueColor = "#16202e",
  sub,
  subColor = "#9aa4b4",
  href,
}: {
  icon: string;
  hue: string;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  sub: string;
  subColor?: string;
  href?: string;
}) {
  const inner = (
    <div className="group relative h-full overflow-hidden rounded-[16px] border border-[#e7ebf1] bg-white p-[16px_18px] shadow-[0_1px_2px_rgba(20,30,48,.04),0_8px_22px_rgba(20,30,48,.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(20,30,48,.10)]">
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${hue}, ${hue}55)` }}
      />
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] text-[14px] font-bold"
          style={{ background: `${hue}1a`, color: hue }}
        >
          {icon}
        </span>
        <span className="min-w-0 text-[12px] leading-tight text-[#69748a]">{label}</span>
      </div>
      <div className="font-num text-[27px] font-extrabold tracking-tight" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: subColor }}>
        {sub}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ActionRow({
  icon,
  bg,
  border,
  text,
  sub,
  subColor,
  href,
  cta,
  mono,
}: {
  icon: string;
  bg: string;
  border: string;
  text: string;
  sub: string;
  subColor: string;
  href: string;
  cta: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[10px] p-[11px_13px]"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <span className="text-[16px]">{icon}</span>
      <div className="flex-1 leading-tight">
        <div className="text-[13px] font-medium">{text}</div>
        <div className={`text-[11.5px] ${mono ? "font-num" : ""}`} style={{ color: subColor }}>
          {sub}
        </div>
      </div>
      <Link
        href={href}
        className="rounded-[8px] border border-[#d7dce4] bg-white px-2.5 py-1.5 text-[12px] text-[#3a4658]"
      >
        {cta}
      </Link>
    </div>
  );
}
