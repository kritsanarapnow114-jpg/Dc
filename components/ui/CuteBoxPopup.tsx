"use client";

export type CuteBoxKind =
  | "in"
  | "out"
  | "adjust"
  | "count"
  | "transfer"
  | "po"
  | "draft";

type KindConfig = {
  box: string;
  box2: string;
  flap: string;
  badge: string;
  icon: string;
  label: string;
  ribbonBg: string;
  ribbonColor: string;
  shadow: string;
};

const CUTE_BOX: Record<CuteBoxKind, KindConfig> = {
  in: {
    box: "#3fb873",
    box2: "#33a862",
    flap: "#2f9d5a",
    badge: "#1f66a6",
    icon: "✓",
    label: "Received In (รับเข้า)",
    ribbonBg: "#e4f4f8",
    ribbonColor: "#1f66a6",
    shadow: "rgba(47,157,90,.32)",
  },
  out: {
    box: "#eea24a",
    box2: "#e5913a",
    flap: "#d9832f",
    badge: "#d5811f",
    icon: "↑",
    label: "Issued Out (จ่ายออก)",
    ribbonBg: "#fdf0e2",
    ribbonColor: "#bd6f12",
    shadow: "rgba(217,131,47,.32)",
  },
  adjust: {
    box: "#46b7e0",
    box2: "#1fa2da",
    flap: "#1c93c8",
    badge: "#2f86cf",
    icon: "✎",
    label: "Adjusted (ปรับปรุง)",
    ribbonBg: "#e4f4f8",
    ribbonColor: "#0e7488",
    shadow: "rgba(31,162,218,.32)",
  },
  count: {
    box: "#46b7e0",
    box2: "#1fa2da",
    flap: "#1c93c8",
    badge: "#2f86cf",
    icon: "☑",
    label: "Counted (นับสต็อก)",
    ribbonBg: "#e4f4f8",
    ribbonColor: "#0e7488",
    shadow: "rgba(31,162,218,.32)",
  },
  transfer: {
    box: "#4dc4b6",
    box2: "#2faa9c",
    flap: "#2a998c",
    badge: "#2f86cf",
    icon: "⇄",
    label: "Transferred (ย้ายที่เก็บ)",
    ribbonBg: "#ddf1f6",
    ribbonColor: "#0e8c7b",
    shadow: "rgba(47,170,156,.32)",
  },
  po: {
    box: "#46b7e0",
    box2: "#1fa2da",
    flap: "#1c93c8",
    badge: "#2f86cf",
    icon: "＋",
    label: "Purchase Order (PO)",
    ribbonBg: "#e4f4f8",
    ribbonColor: "#0e7488",
    shadow: "rgba(31,162,218,.32)",
  },
  draft: {
    box: "#c3cdd8",
    box2: "#adb8c5",
    flap: "#9aa6b4",
    badge: "#69748a",
    icon: "≡",
    label: "Draft Saved (บันทึกร่าง)",
    ribbonBg: "#eef1f5",
    ribbonColor: "#69748a",
    shadow: "rgba(120,132,150,.28)",
  },
};

export function CuteBoxPopup({
  open,
  kind,
  message,
  onClose,
}: {
  open: boolean;
  kind: CuteBoxKind;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const c = CUTE_BOX[kind];
  return (
    <div
      className="anim-fade fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(16,24,38,.44)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-pop-in flex w-[300px] flex-col items-center rounded-[22px] bg-white px-7 py-8 text-center"
        style={{ boxShadow: `0 24px 60px ${c.shadow}` }}
      >
        <div className="anim-float relative mb-5 h-16 w-20">
          <div
            className="absolute bottom-0 left-0 h-11 w-20 rounded-[6px]"
            style={{ background: c.box }}
          />
          <div
            className="absolute bottom-0 left-0 h-11 w-20 rounded-[6px]"
            style={{
              background: c.box2,
              clipPath: "polygon(0 45%,100% 45%,100% 100%,0 100%)",
            }}
          />
          <div
            className="absolute left-0.5 top-0 h-6 w-9 origin-bottom-right -rotate-[18deg] rounded-t-[4px]"
            style={{ background: c.flap }}
          />
          <div
            className="absolute right-0.5 top-0 h-6 w-9 origin-bottom-left rotate-[18deg] rounded-t-[4px]"
            style={{ background: c.flap }}
          />
          <div
            className="anim-pop absolute -right-2 -top-3 flex h-8 w-8 items-center justify-center rounded-full text-[14px] text-white"
            style={{ background: c.badge, boxShadow: `0 4px 10px ${c.shadow}` }}
          >
            {c.icon}
          </div>
        </div>
        <div
          className="mb-2.5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ background: c.ribbonBg, color: c.ribbonColor }}
        >
          {c.label}
        </div>
        <div className="mb-1 text-[15px] font-semibold text-[#16202e]">
          Saved!
        </div>
        <div className="mb-5 text-[12.5px] leading-snug text-[#69748a]">
          {message}
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-[10px] py-2.5 text-[13px] font-semibold text-white"
          style={{ background: c.badge }}
        >
          Done (เยี่ยม!)
        </button>
      </div>
    </div>
  );
}
