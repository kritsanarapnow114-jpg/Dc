import { MovementBucket } from "@/lib/views/compare";

const RECV = "#2f86cf";
const ISSUE = "#e59a2b";

function line(pts: { x: number; y: number }[]): string {
  if (!pts.length) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function Panel({
  title,
  buckets,
  max,
  accent,
}: {
  title: string;
  buckets: MovementBucket[];
  max: number;
  accent: string;
}) {
  const W = 360, H = 150, PL = 8, PR = 8, PT = 12, PB = 22;
  const n = buckets.length;
  const baseY = H - PB;
  const plotH = baseY - PT;
  const plotW = W - PL - PR;
  const xAt = (i: number) => (n > 1 ? PL + (i / (n - 1)) * plotW : PL + plotW / 2);
  const yAt = (v: number) => baseY - (v / max) * plotH;
  const recvPts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.recv) }));
  const issuePts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.issue) }));
  const recvLine = line(recvPts);
  const recvArea = n ? `${recvLine} L ${xAt(n - 1).toFixed(1)},${baseY} L ${xAt(0).toFixed(1)},${baseY} Z` : "";
  const totalRecv = buckets.reduce((s, b) => s + b.recv, 0);
  const totalIssue = buckets.reduce((s, b) => s + b.issue, 0);
  const step = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="rounded-[12px] border border-[#e7ebf1] bg-white p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: accent }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} /> {title}
        </span>
        <span className="font-num text-[11px] text-[#9aa4b4]">
          รับ {Math.round(totalRecv).toLocaleString()} · จ่าย {Math.round(totalIssue).toLocaleString()}
        </span>
      </div>
      {n === 0 ? (
        <div className="py-8 text-center text-[12px] text-[#9aa4b4]">ไม่มีการเคลื่อนไหวในช่วงนี้</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
          <defs>
            <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RECV} stopOpacity="0.22" />
              <stop offset="100%" stopColor={RECV} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={PL} y1={PT + plotH * f} x2={W - PR} y2={PT + plotH * f} stroke="#eef1f5" strokeWidth="1" />
          ))}
          <path d={recvArea} fill={`url(#g-${title})`} />
          <path d={recvLine} fill="none" stroke={RECV} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={line(issuePts)} fill="none" stroke={ISSUE} strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
          {buckets.map((b, i) =>
            i % step === 0 || i === n - 1 ? (
              <text key={i} x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="8.5" fill="#9aa4b4">
                {b.label}
              </text>
            ) : null
          )}
        </svg>
      )}
    </div>
  );
}

export function MovementCompare({ a, b }: { a: MovementBucket[]; b: MovementBucket[] }) {
  const max = Math.max(
    1,
    ...a.map((x) => Math.max(x.recv, x.issue)),
    ...b.map((x) => Math.max(x.recv, x.issue))
  );
  return (
    <div className="rounded-[13px] border border-[#e7ebf1] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-bold text-[#16202e]">การเคลื่อนไหว (รับเข้า/จ่ายออก) · Movement</span>
        <span className="flex items-center gap-1 text-[11px] text-[#69748a]">
          <span className="inline-block h-[3px] w-4 rounded" style={{ background: RECV }} /> รับเข้า
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#69748a]">
          <span className="inline-block h-[3px] w-4 rounded" style={{ background: ISSUE }} /> จ่ายออก
        </span>
        <span className="text-[10.5px] text-[#9aa4b4]">(สเกลแกน Y เท่ากันทั้งสองช่วง เทียบกันได้)</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Panel title="ช่วง A (ช่วงนี้)" buckets={a} max={max} accent="#2f86cf" />
        <Panel title="ช่วง B (เทียบกับ)" buckets={b} max={max} accent="#8a94a6" />
      </div>
    </div>
  );
}
