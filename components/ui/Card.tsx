export function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[14px] border border-[#e7ebf1] bg-white p-[18px_20px] shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)] ${className}`}
      style={{ padding: "18px 20px", ...style }}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-baseline gap-3">
      <div className="flex-1 text-[14px] font-semibold text-[#16202e]">
        {children}
      </div>
      {action}
    </div>
  );
}
