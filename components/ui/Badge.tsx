import { Tone, TONE_COLORS } from "./tone";

export function Badge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  const c = TONE_COLORS[tone];
  return (
    <span
      style={{ background: c.bg, color: c.text }}
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
    >
      {children}
    </span>
  );
}
