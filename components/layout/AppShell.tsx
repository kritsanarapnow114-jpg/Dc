"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({
  poPendingCount,
  user,
  subtitleOverrides,
  children,
}: {
  poPendingCount: number;
  user: { name: string; role: string; permission: string; avatarInitials: string };
  subtitleOverrides?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        poPendingCount={poPendingCount}
        user={user}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          subtitleOverrides={subtitleOverrides}
          permission={user.permission}
        />
        <div
          className="flex-1 overflow-auto"
          style={{
            backgroundColor: "#eef5fc",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='110' viewBox='0 0 150 110'%3E%3Cg fill='%232f86cf' fill-opacity='0.05'%3E%3Cellipse cx='40' cy='34' rx='30' ry='13'/%3E%3Ccircle cx='26' cy='30' r='13'/%3E%3Ccircle cx='44' cy='24' r='17'/%3E%3Ccircle cx='60' cy='31' r='12'/%3E%3Cellipse cx='112' cy='82' rx='26' ry='11'/%3E%3Ccircle cx='100' cy='78' r='11'/%3E%3Ccircle cx='116' cy='72' r='14'/%3E%3Ccircle cx='130' cy='79' r='10'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "300px 220px",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
