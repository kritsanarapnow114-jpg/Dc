"use client";

export function Modal({
  open,
  onClose,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(16,24,38,.44)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-auto rounded-[16px] bg-white shadow-[0_24px_60px_rgba(16,24,38,.32)]"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  onClose,
  action,
}: {
  title: React.ReactNode;
  onClose: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#eef1f5] px-5 py-4">
      <div className="flex-1 text-[15px] font-semibold text-[#16202e]">
        {title}
      </div>
      {action}
      <button
        onClick={onClose}
        className="text-[18px] leading-none text-[#9aa4b4] hover:text-[#3a4658]"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
