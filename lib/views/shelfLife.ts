import "server-only";
import { db } from "@/lib/db";
import { daysBetween, todayBangkok } from "@/lib/calc/date";

export type ShelfLifeRow = {
  code: string;
  name: string;
  balanceKg: number;
  daysLeft: number | null;
};

/**
 * Per-product stock balance vs remaining shelf life — the data behind the
 * "Inventory Balance (Kg.) vs Shelf Life (Days)" chart. Balance is the total
 * on-hand across the product's lots; days-left is until the soonest-expiring lot.
 */
export async function getShelfLifeRows(today: Date = todayBangkok()): Promise<ShelfLifeRow[]> {
  const lots = await db.lot.findMany({ where: { qty: { gt: 0 } }, include: { product: true } });

  const byProduct = new Map<string, { name: string; balance: number; soonestExp: Date | null }>();
  for (const l of lots) {
    const g = byProduct.get(l.productCode) ?? { name: l.product.nameEn, balance: 0, soonestExp: null };
    g.balance += l.qty;
    if (l.expDate && (!g.soonestExp || l.expDate < g.soonestExp)) g.soonestExp = l.expDate;
    byProduct.set(l.productCode, g);
  }

  const rows: ShelfLifeRow[] = [...byProduct.entries()]
    // Only items that actually have an expiry date — no point plotting shelf life
    // for goods that never expire.
    .filter(([, g]) => g.soonestExp !== null)
    .map(([code, g]) => ({
      code,
      name: g.name,
      balanceKg: g.balance,
      daysLeft: daysBetween(g.soonestExp!, today),
    }));

  // Most urgent (fewest days left) first.
  return rows.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}
