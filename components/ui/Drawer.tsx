"use client";

export function Drawer({
  open,
  onClose,
  children,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      className="anim-fade fixed inset-0 z-50"
      style={{ background: "rgba(16,24,38,.42)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full overflow-auto bg-white shadow-[-8px_0_30px_rgba(16,24,38,.15)]"
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}
