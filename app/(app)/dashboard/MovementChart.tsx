"use client";

import { useState, useRef } from "react";
import { MovementBucket } from "@/lib/views/dashboard";
import { Modal, ModalHeader } from "@/components/ui/Modal";

const W = 720, H = 240, PADL = 12, PADR = 12, PADT = 16, PADB = 28;

// Smooth path through points using a Catmull-Rom → cubic-bezier conversion.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildGeometry(buckets: MovementBucket[]) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.recv, b.issue)));
  const n = buckets.length;
  const baseY = H - PADB;
  const plotH = baseY - PADT;
  const plotW = W - PADL - PADR;
  const xAt = (i: number) => (n > 1 ? PADL + (i / (n - 1)) * plotW : PADL + plotW / 2);
  const yAt = (v: number) => baseY - (v / max) * plotH;

  const recvPts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.recv) }));
  const issuePts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.issue) }));
  const recvLine = smoothPath(recvPts);
  const issueLine = smoothPath(issuePts);
  const recvArea = `${recvLine} L ${xAt(n - 1).toFixed(1)},${baseY} L ${xAt(0).toFixed(1)},${baseY} Z`;

  const step = Math.max(1, Math.ceil(n / 12));
  const labels = buckets.map((b, i) => ({
    x: xAt(i),
    text: b.label,
    show: i % step === 0 || i === n - 1,
  }));
  const pts = buckets.map((b, i) => ({
    x: xAt(i),
    yRecv: yAt(b.recv),
    yIssue: yAt(b.issue),
    label: b.label,
    recv: b.recv,
    issue: b.issue,
  }));
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => baseY - f * plotH);
  return { recvLine, issueLine, recvArea, labels, grid, baseY, pts, plotW };
}

export function MovementChart({
  buckets,
  totalRecv,
  totalIssue,
}: {
  buckets: MovementBucket[];
  totalRecv: number;
  totalIssue: number;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { recvLine, issueLine, recvArea, labels, grid, baseY, pts, plotW } =
    buildGeometry(buckets);
  const last = pts[pts.length - 1];

  function onMove(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg || pts.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const rel = (svgX - PADL) / plotW;
    const i = Math.round(rel * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  }

  const hp = hover !== null ? pts[hover] : null;
  const TW = 122, TH = 60;
  const tx = hp ? Math.max(PADL, Math.min(W - PADR - TW, hp.x - TW / 2)) : 0;

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <div className="flex-1 text-[14px] font-semibold">
          Stock Movement (ความเคลื่อนไหว)
        </div>
        <button onClick={() => setOpen(true)} className="text-[12px] text-[#12b5d4]">
          Detail →
        </button>
        <div className="text-[11.5px] text-[#9aa4b4]">
          In {totalRecv.toLocaleString()} · Out {totalIssue.toLocaleString()}
        </div>
        <div className="flex w-full gap-3.5 text-[11.5px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#12b5d4]" />
            Received (รับเข้า)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#6c5ce7]" />
            Issued (จ่ายออก)
          </span>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full">
        <defs>
          <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12b5d4" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#12b5d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((y, i) => (
          <line key={i} x1={PADL} y1={y} x2={W - PADR} y2={y} stroke={i === grid.length - 1 ? "#e2e6ec" : "#f1f3f7"} strokeWidth="1" />
        ))}
        <path d={recvArea} fill="url(#recvGrad)" />
        <path d={issueLine} fill="none" stroke="#6c5ce7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={recvLine} fill="none" stroke="#12b5d4" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />

        {/* end dots when idle */}
        {!hp && last && (
          <>
            <circle cx={last.x} cy={last.yRecv} r="3.5" fill="#12b5d4" stroke="#fff" strokeWidth="1.5" />
            <circle cx={last.x} cy={last.yIssue} r="3.5" fill="#6c5ce7" stroke="#fff" strokeWidth="1.5" />
          </>
        )}

        <g fontSize="10" fill="#9aa4b4" fontFamily="IBM Plex Mono" textAnchor="middle">
          {labels.map((l, i) => (l.show ? <text key={i} x={l.x} y={baseY + 18}>{l.text}</text> : null))}
        </g>

        {/* hover crosshair + tooltip */}
        {hp && (
          <g>
            <line x1={hp.x} y1={PADT - 6} x2={hp.x} y2={baseY} stroke="#c4ccd8" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp.x} cy={hp.yRecv} r="4" fill="#12b5d4" stroke="#fff" strokeWidth="1.5" />
            <circle cx={hp.x} cy={hp.yIssue} r="4" fill="#6c5ce7" stroke="#fff" strokeWidth="1.5" />
            <rect x={tx} y="4" width={TW} height={TH} rx="7" fill="#ffffff" stroke="#e2e6ec" strokeWidth="1" />
            <text x={tx + 10} y="20" fontSize="11" fontWeight="700" fill="#16202e">{hp.label}</text>
            <text x={tx + 10} y="37" fontSize="10.5" fill="#0e8ea6" fontFamily="IBM Plex Mono">รับเข้า +{hp.recv.toLocaleString()}</text>
            <text x={tx + 10} y="52" fontSize="10.5" fill="#6c5ce7" fontFamily="IBM Plex Mono">จ่ายออก −{hp.issue.toLocaleString()}</text>
          </g>
        )}

        {/* transparent overlay to capture hover across the whole plot */}
        <rect x="0" y="0" width={W} height={H} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      <Modal open={open} onClose={() => setOpen(false)} width={520}>
        <ModalHeader title="Stock Movement detail" onClose={() => setOpen(false)} />
        <div className="max-h-[400px] overflow-auto px-5 py-4">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="text-left text-[#9aa4b4]">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 text-right font-medium">Received</th>
                <th className="pb-2 text-right font-medium">Issued</th>
                <th className="pb-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i} className="border-t border-[#eef1f5]">
                  <td className="font-num py-2">{b.label}</td>
                  <td className="font-num py-2 text-right text-[#1f66a6]">
                    +{b.recv.toLocaleString()}
                  </td>
                  <td className="font-num py-2 text-right text-[#c9821f]">
                    −{b.issue.toLocaleString()}
                  </td>
                  <td className="font-num py-2 text-right font-semibold">
                    {(b.recv - b.issue).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
