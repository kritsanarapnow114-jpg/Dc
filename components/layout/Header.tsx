"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PAGE_TITLES } from "./nav";
import { CurrencyToggleButton } from "@/components/ui/Currency";
import { NewDocMenu } from "./NewDocMenu";
import { canWrite } from "@/lib/permissions";

export function Header({
  onMenuClick,
  subtitleOverrides,
  permission,
}: {
  onMenuClick?: () => void;
  subtitleOverrides?: Record<string, string>;
  permission?: string;
}) {
  const writable = canWrite(permission);
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const base = PAGE_TITLES[pathname] ?? { title: "NBC Warehouse", sub: "" };
  const page = pathname.replace(/^\//, "");
  const override = subtitleOverrides?.[page];
  const info = { title: base.title, sub: override ?? base.sub };

  return (
    <header className="sticky top-0 z-20 flex h-[62px] flex-none items-center gap-2 border-b border-[#e7ebf1] bg-white/90 px-3 shadow-[0_1px_12px_rgba(20,30,48,.04)] backdrop-blur-md sm:gap-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="flex-none rounded-[8px] p-1.5 text-[20px] leading-none text-[#3a4658] lg:hidden"
        aria-label="Open menu"
      >
        ☰
      </button>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[15px] font-semibold text-[#16202e] sm:text-[16px]">
          {info.title}
        </div>
        <div className="hidden truncate text-[11.5px] text-[#69748a] sm:block">{info.sub}</div>
      </div>
      <div className="flex-1" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="hidden w-[160px] items-center gap-2 rounded-[9px] border border-[#e2e6ec] bg-[#f1f3f7] px-3 py-2 sm:flex md:w-[220px] lg:w-[290px]"
      >
        <span className="text-[14px] text-[#9aa4b4]">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา สินค้า / PO / Invoice / SAP Doc / Lot"
          className="w-full min-w-0 border-0 bg-transparent text-[13px] text-[#16202e] outline-none"
        />
      </form>
      <CurrencyToggleButton />
      {writable ? (
        <NewDocMenu />
      ) : (
        <span className="flex-none rounded-[9px] border border-[#e2e6ec] bg-[#f1f3f7] px-3 py-2 text-[12px] font-medium text-[#69748a]">
          👁 ดูอย่างเดียว (read-only)
        </span>
      )}
    </header>
  );
}
