"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_GROUPS } from "./nav";
import { NavIcon } from "./NavIcons";
import { logoutAction } from "@/lib/actions/auth";

export function Sidebar({
  poPendingCount,
  user,
  mobileOpen = false,
  onClose,
}: {
  poPendingCount: number;
  user: { name: string; role: string; avatarInitials: string };
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  // Which group holds the current page — it always stays open.
  const activeGroupKey = NAV_GROUPS.find((g) =>
    g.items.some((k) => {
      const it = NAV_ITEMS.find((n) => n.key === k);
      return it && pathname.startsWith(it.href);
    })
  )?.key;

  // Collapsible group headings (dropdowns). Start with only the active group open.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(NAV_GROUPS.map((g) => g.key).filter((k) => k !== activeGroupKey))
  );
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[240px] flex-none flex-col text-[#e8f2fb] shadow-[2px_0_16px_rgba(13,20,36,.12)] transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "linear-gradient(180deg,#47a6dd,#1f5f9e)" }}
      >
        <div className="border-b border-white/15 px-[16px] py-3.5">
          <div className="flex items-start">
            <div className="flex-1 rounded-[10px] bg-white px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fls-logo.png" alt="FLS GROUP" className="mx-auto h-8 w-auto" />
            </div>
            <button
              onClick={onClose}
              className="ml-2 flex-none text-[18px] leading-none text-white/70 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
          <div className="mt-2 text-center leading-tight">
            <div className="text-[13.5px] font-bold text-white">NBC Warehouse</div>
            <div className="text-[10px] text-[#cfe4f6]">Warehouse Mgmt (ระบบคลังสินค้า)</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-auto p-3">
          {NAV_GROUPS.map((group) => {
            const open = !collapsed.has(group.key) || group.key === activeGroupKey;
            return (
            <div key={group.key} className="mb-1.5">
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center gap-1 px-2 pb-1 pt-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/55 hover:text-white/80"
              >
                <span className={`text-[8px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                <span className="flex-1">
                  {group.en} <span className="font-medium normal-case tracking-normal text-white/40">· {group.th}</span>
                </span>
              </button>
              <div className={`flex-col gap-0.5 ${open ? "flex" : "hidden"}`}>
                {group.items.map((key) => {
                  const item = NAV_ITEMS.find((n) => n.key === key);
                  if (!item) return null;
                  const active = pathname.startsWith(item.href);
                  const badge = item.key === "po" && poPendingCount > 0 ? poPendingCount : null;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] ${
                        active ? "bg-white text-[#1f5f9e]" : "bg-white/[.06] text-[#e8f2fb] hover:bg-white/[.12]"
                      }`}
                    >
                      <span className={`flex w-[22px] flex-none items-center justify-center ${active ? "text-[#1f5f9e]" : "text-white/90"}`}>
                        <NavIcon name={item.key} />
                      </span>
                      <span className="flex-1 text-left leading-tight">
                        <span className="block">{item.en}</span>
                        <span className={`block text-[10px] ${active ? "text-[#5fa987]" : "text-[#bfe4d1]"}`}>
                          ({item.th})
                        </span>
                      </span>
                      {badge !== null && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            active ? "bg-[#1f5f9e]/15 text-[#1f5f9e]" : "bg-[#c53f3f] text-white"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>

        <Link
          href="/settings"
          onClick={onClose}
          className={`mx-3 mb-1 flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[12px] ${
            pathname.startsWith("/settings")
              ? "bg-white text-[#1f5f9e]"
              : "bg-white/[.06] text-[#cfe4f6] hover:bg-white/[.12]"
          }`}
        >
          <span className="flex w-[22px] flex-none items-center justify-center">
            <NavIcon name="settings" size={17} />
          </span>
          Settings (ตั้งค่า)
        </Link>

        <form
          action={logoutAction}
          className="flex items-center gap-2.5 border-t border-white/15 px-4 py-3.5"
        >
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[.22] text-[12px] font-semibold text-white">
            {user.avatarInitials}
          </div>
          <div className="flex-1 leading-tight">
            <div className="text-[12.5px] font-medium text-white">
              {user.name}
            </div>
            <div className="text-[10.5px] text-[#cfe4f6]">{user.role}</div>
          </div>
          <button
            type="submit"
            title="Sign out"
            className="rounded-[7px] px-2 py-1 text-[11px] text-[#cfe4f6] hover:bg-white/[.12]"
          >
            Exit
          </button>
        </form>
      </aside>
    </>
  );
}
