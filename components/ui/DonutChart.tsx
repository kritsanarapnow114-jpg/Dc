"use client";

import { useState, type ReactNode } from "react";

/** Simple SVG donut built from stroked arc segments (no chart library).
 *  Hover a segment to see its name, value and share. */
export function DonutChart({
  data,
  size = 172,
  thickness = 26,
  prefix = "",
  center,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  prefix?: string;
  center?: ReactNode;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (v: number) => prefix + Math.round(v).toLocaleString();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const fracs = data.map((d) => d.value / total);
  const offsets = fracs.map((_, i) => fracs.slice(0, i).reduce((s, f) => s + f, 0));

  return (
    <div className="relative" style={{ width: size, height: size }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="flex-none">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f5" strokeWidth={thickness} />
          {data.map((d, i) => {
            const seg = fracs[i] * C;
            const on = hover === i;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={on ? thickness + 4 : thickness}
                strokeDasharray={`${seg} ${C - seg}`}
                strokeDashoffset={-offsets[i] * C}
                opacity={hover === null || on ? 1 : 0.45}
                onMouseEnter={() => setHover(i)}
                style={{ cursor: "pointer", transition: "opacity .12s" }}
              >
                <title>
                  {d.name}: {fmt(d.value)} ({((d.value / total) * 100).toFixed(1)}%)
                </title>
              </circle>
            );
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {hover !== null ? (
          <>
            <div className="max-w-full truncate text-[10.5px] font-medium text-[#69748a]">
              {data[hover].name}
            </div>
            <div className="font-num text-[15px] font-bold text-[#16202e]">{fmt(data[hover].value)}</div>
            <div className="text-[10.5px] font-semibold" style={{ color: data[hover].color }}>
              {((data[hover].value / total) * 100).toFixed(1)}%
            </div>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}
