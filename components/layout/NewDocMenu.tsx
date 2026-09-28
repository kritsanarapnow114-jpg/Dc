"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const OPTIONS = [
  { href: "/receive", icon: "▼", label: "Receive (รับสินค้า)" },
  { href: "/issue", icon: "▲", label: "Issue (จ่ายสินค้า)" },
  { href: "/ship", icon: "🚚", label: "Ship Order (ออเดอร์จัดส่ง)" },
  { href: "/returns", icon: "↩", label: "Customer Return (รับคืนสินค้า)" },
  { href: "/po", icon: "◫", label: "Purchase Order (ใบสั่งซื้อ)" },
  { href: "/adjust", icon: "◆", label: "Adjust (ปรับปรุงสต็อก)" },
  { href: "/transfer", icon: "⇄", label: "Transfer (ย้ายที่เก็บ)" },
  { href: "/count", icon: "☑", label: "Stock Count (นับสต็อก)" },
];

export function NewDocMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[9px] border-0 bg-[#2f86cf] px-3 py-2.5 text-[13px] font-semibold text-white sm:px-3.5"
      >
        <span className="sm:hidden">+ New</span>
        <span className="hidden sm:inline">+ New Document (สร้างเอกสาร)</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-[11px] border border-[#e7ebf1] bg-white py-1.5 shadow-[0_8px_28px_rgba(20,30,48,.16)]">
          {OPTIONS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#16202e] hover:bg-[#f7f9fb]"
            >
              <span className="w-4 text-center text-[13px] text-[#2f86cf]">
                {o.icon}
              </span>
              {o.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
