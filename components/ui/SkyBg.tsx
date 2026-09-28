// Self-contained soft "sky with clouds" scene (inline SVG, no external image)
// — a fresh blue sky, sun glow, fluffy clouds and a pale warehouse on the
// horizon. Sits full-bleed behind content.
export function SkyBg({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="skGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe0f7" />
          <stop offset="0.5" stopColor="#d8ecfb" />
          <stop offset="1" stopColor="#eef7fd" />
        </linearGradient>
        <radialGradient id="skSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3c9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff3c9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="skBldg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcecf8" />
          <stop offset="1" stopColor="#c6def2" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="1200" height="800" fill="url(#skGrad)" />

      {/* sun */}
      <circle cx="960" cy="150" r="200" fill="url(#skSun)" />
      <circle cx="960" cy="150" r="58" fill="#ffe79a" opacity="0.9" />

      {/* clouds — each: soft shadow underside + white puffs */}
      <g>
        <Cloud x={170} y={150} s={1.15} />
        <Cloud x={560} y={95} s={0.85} />
        <Cloud x={840} y={230} s={1} />
        <Cloud x={330} y={300} s={0.7} />
        <Cloud x={1030} y={120} s={0.6} />
        <Cloud x={70} y={370} s={0.8} />
      </g>

      {/* pale warehouse on the horizon */}
      <g opacity="0.9">
        <rect x="380" y="612" width="440" height="150" rx="12" fill="url(#skBldg)" />
        <path d="M368 618 Q600 548 832 618 L832 640 Q600 570 368 640 Z" fill="#b7d4ec" />
        <g fill="#eaf4fc" stroke="#cadff2" strokeWidth="2">
          <rect x="415" y="672" width="96" height="90" rx="7" />
          <rect x="552" y="672" width="96" height="90" rx="7" />
          <rect x="689" y="672" width="96" height="90" rx="7" />
        </g>
      </g>

      {/* soft foreground haze */}
      <path d="M0 720 Q300 690 600 716 T1200 704 V800 H0 Z" fill="#f2f9fe" opacity="0.85" />
    </svg>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="10" cy="34" rx="96" ry="22" fill="#c9e0f2" opacity="0.55" />
      <circle cx="-46" cy="16" r="30" fill="#ffffff" />
      <circle cx="-8" cy="2" r="42" fill="#ffffff" />
      <circle cx="40" cy="10" r="34" fill="#ffffff" />
      <circle cx="70" cy="22" r="24" fill="#ffffff" />
      <rect x="-72" y="20" width="150" height="26" rx="13" fill="#ffffff" />
    </g>
  );
}
