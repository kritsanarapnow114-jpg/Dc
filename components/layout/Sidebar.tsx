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
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[240px] flex-none flex-col text-[#e6e8ec] shadow-[2px_0_16px_rgba(13,20,36,.12)] transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "linear-gradient(180deg,#2a2f37,#1b1f25)" }}
      >
        <div className="border-b border-white/10 px-[16px] py-3.5">
          <div className="flex items-start">
            <div className="flex h-12 flex-1 items-center justify-center rounded-[10px] bg-white px-3">
              <span className="text-[19px] font-extrabold tracking-tight text-[#d71f28]">DC Chainat</span>
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
            <div className="text-[10px] text-[#8b95a5]">Created by Kritsana.P</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col overflow-auto px-3 py-2">
          {NAV_GROUPS.map((group) => {
            const open = !collapsed.has(group.key) || group.key === activeGroupKey;
            return (
              <div key={group.key} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="group flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left hover:bg-white/[.04]"
                >
                  <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: group.hue }} />
                  <span className="flex-1 text-[12px] font-semibold text-[#c3c9d3]">
                    {group.th}
                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-[#6b7585]">
                      {group.en}
                    </span>
                  </span>
                  <span
                    className={`flex-none text-[#6b7585] transition-transform duration-150 group-hover:text-[#aab2bf] ${
                      open ? "rotate-90" : ""
                    }`}
                  >
                    <NavIcon name="chevron" size={14} />
                  </span>
                </button>
                <div className={`flex-col gap-0.5 pb-1 ${open ? "flex" : "hidden"}`}>
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
                        className={`flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors ${
                          active
                            ? "bg-[#d71f28] text-white shadow-[0_2px_10px_rgba(215,31,40,.35)]"
                            : "text-[#e6e8ec] hover:bg-white/[.06]"
                        }`}
                      >
                        <span
                          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px]"
                          style={
                            active
                              ? { background: "rgba(255,255,255,.2)", color: "#fff" }
                              : { background: `${group.hue}1f`, color: group.hue }
                          }
                        >
                          <NavIcon name={item.key} size={17} />
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-[13px] font-medium">{item.th}</span>
                          <span className={`block truncate text-[10.5px] ${active ? "text-white/75" : "text-[#7f8999]"}`}>
                            {item.en}
                          </span>
                        </span>
                        {badge !== null && (
                          <span
                            className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10.5px] font-bold ${
                              active ? "bg-white text-[#d71f28]" : "bg-[#d71f28] text-white"
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

        <div className="border-t border-white/10 px-3 py-2">
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 ${
              pathname.startsWith("/settings")
                ? "bg-[#d71f28] text-white"
                : "text-[#c3c9d3] hover:bg-white/[.06]"
            }`}
          >
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] bg-white/[.07]">
              <NavIcon name="settings" size={17} />
            </span>
            <span className="text-[13px] font-medium">ตั้งค่า</span>
            <span className="text-[10.5px] text-[#7f8999]">Settings</span>
          </Link>
        </div>

        <form action={logoutAction} className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
          <div className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[#d71f28] text-[12px] font-semibold text-white">
            {user.avatarInitials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12.5px] font-medium text-white">{user.name}</div>
            <div className="truncate text-[10.5px] text-[#8b95a5]">{user.role}</div>
          </div>
          <button
            type="submit"
            title="ออกจากระบบ (Sign out)"
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#aab2bf] hover:bg-white/[.08] hover:text-white"
          >
            <NavIcon name="logout" size={17} />
          </button>
        </form>
      </aside>
    </>
  );
}
