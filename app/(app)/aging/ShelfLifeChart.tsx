"use client";

import { useRef } from "react";
import type { ShelfLifeRow } from "@/lib/views/shelfLife";

const BLUE = "#1f9ec9";
const RED = "#e0362a";

// Layout constants (px).
const PAD_L = 78;
const PAD_R = 24;
const PAD_T = 64;
const PLOT_H = 340;
const PAD_B = 210;
const STEP = 48;
const BAR_W = 30;

export function ShelfLifeChart({ rows }: { rows: ShelfLifeRow[] }) {
  const ref = useRef<SVGSVGElement>(null);

  const maxVal = Math.max(1, ...rows.map((r) => r.balanceKg));
  // Round the axis top up to a clean number.
  const niceMax = niceCeil(maxVal);
  const W = PAD_L + rows.length * STEP + PAD_R;
  const H = PAD_T + PLOT_H + PAD_B;
  const y = (v: number) => PAD_T + PLOT_H - (v / niceMax) * PLOT_H;
  const ticks = 7;

  function downloadPng() {
    const svg = ref.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2; // crisp
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "inventory-balance-vs-shelf-life.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = url;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex-1 text-[14px] font-semibold">
          คงเหลือ (Kg.) เทียบ อายุที่เหลือ (วัน) · Balance vs Shelf Life
        </div>
        <button
          onClick={downloadPng}
          className="rounded-[8px] bg-[#2f86cf] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#1f66a6]"
        >
          ⤓ บันทึกกราฟ (PNG)
        </button>
        <a
          href="/api/export/shelf-life"
          className="rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3 py-1.5 text-[12.5px] font-semibold text-[#0c7f93]"
        >
          ⤓ Excel (ข้อมูล)
        </a>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={ref}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
          <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={700} fill="#16202e">
            INVENTORY BALANCE (KG.) vs SHELF LIFE (DAYS)
          </text>
          {/* legend */}
          <rect x={W / 2 - 150} y={40} width={11} height={11} fill={BLUE} />
          <text x={W / 2 - 134} y={49} fontSize={11} fill="#3a4658">
            Stock Balance (Kg.)
          </text>
          <rect x={W / 2 + 8} y={40} width={11} height={11} fill={RED} />
          <text x={W / 2 + 24} y={49} fontSize={11} fill="#3a4658">
            Remaining Shelf Life Days
          </text>

          {/* y-axis gridlines + labels */}
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const v = (niceMax / ticks) * i;
            const yy = y(v);
            return (
              <g key={i}>
                <line x1={PAD_L} y1={yy} x2={W - PAD_R} y2={yy} stroke="#eef1f5" />
                <text x={PAD_L - 8} y={yy + 3} textAnchor="end" fontSize={10} fill="#9aa4b4">
                  {Math.round(v).toLocaleString()}
                </text>
              </g>
            );
          })}
          {/* axis label */}
          <text
            x={16}
            y={PAD_T + PLOT_H / 2}
            fontSize={11}
            fontWeight={600}
            fill="#69748a"
            transform={`rotate(-90 16 ${PAD_T + PLOT_H / 2})`}
            textAnchor="middle"
          >
            INVENTORY BALANCE (KG.)
          </text>

          {rows.map((r, i) => {
            const cx = PAD_L + i * STEP + STEP / 2;
            const barX = cx - BAR_W / 2;
            const barTop = y(r.balanceKg);
            const barH = PAD_T + PLOT_H - barTop;
            const label = r.daysLeft === null ? "—" : String(r.daysLeft);
            const boxW = Math.max(22, label.length * 8 + 10);
            const boxY = Math.max(PAD_T - 2, barTop - 24);
            return (
              <g key={r.code}>
                <rect x={barX} y={barTop} width={BAR_W} height={barH} fill={BLUE} />
                {/* red days-left label */}
                <rect x={cx - boxW / 2} y={boxY} width={boxW} height={17} rx={2} fill={RED} />
                <text
                  x={cx}
                  y={boxY + 12}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill="#ffffff"
                >
                  {label}
                </text>
                {/* rotated material name */}
                <text
                  x={cx}
                  y={PAD_T + PLOT_H + 12}
                  fontSize={9.5}
                  fill="#5b6473"
                  transform={`rotate(-40 ${cx} ${PAD_T + PLOT_H + 12})`}
                  textAnchor="end"
                >
                  {r.name}
                </text>
              </g>
            );
          })}
          {/* x-axis title */}
          <text x={W / 2} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="#16202e">
            MATERIAL DESCRIPTION
          </text>
        </svg>
      </div>
    </div>
  );
}

/** Round up to a clean axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceCeil(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}
