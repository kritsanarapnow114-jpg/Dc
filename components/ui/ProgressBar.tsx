export function ProgressBar({
  pct,
  color = "#5b6b82",
  height = 11,
  track = "#eef1f5",
}: {
  pct: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        height,
        background: track,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          background: color,
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}
