import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CurrencyProvider } from "@/components/ui/Currency";
import { ToastHost } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";
import { getAppSettings } from "@/lib/views/settings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const poPendingCount = await db.purchaseOrder.count({
    where: { status: "PENDING" },
  });
  const settings = await getAppSettings();
  const subtitleOverrides: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (k.startsWith("subtitle.")) subtitleOverrides[k.slice("subtitle.".length)] = v;
  }

  return (
    <CurrencyProvider>
      <ToastHost />
      <AppShell
        poPendingCount={poPendingCount}
        subtitleOverrides={subtitleOverrides}
        user={{
          name: session.name,
          role: session.role,
          permission: session.permission,
          avatarInitials: session.avatarInitials,
        }}
      >
        {children}
      </AppShell>
    </CurrencyProvider>
  );
}
