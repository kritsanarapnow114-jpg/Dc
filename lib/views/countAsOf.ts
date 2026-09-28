import "server-only";
import { db } from "@/lib/db";

/**
 * Reconstruct each lot's on-hand quantity as of the END of the given date.
 *
 * We start from the current quantity and undo every stock movement dated AFTER
 * the as-of day. Starting from "current" (not from zero) is important because
 * opening balances were seeded directly onto lots, not as receipt documents —
 * so a forward sum of movements alone would miss them.
 *
 * Reversed documents are ignored (they already net out of current stock).
 */
export async function getLotQtyAsOf(asOfDateStr: string): Promise<Map<string, number>> {
  // Movements dated on/after this cutoff (start of the next day) are "after" the
  // as-of day and get undone. Movements on the as-of day itself are kept.
  const cutoff = new Date(asOfDateStr);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() + 1);

  const lots = await db.lot.findMany({
    select: { id: true, qty: true, productCode: true, lotNo: true, locationCode: true },
  });

  // Current quantity per lot, and an index to find a transfer's destination lot.
  const current = new Map<string, number>();
  const byKey = new Map<string, string>(); // `${product}|${lot}|${loc}` -> lotId
  for (const l of lots) {
    current.set(l.id, l.qty);
    byKey.set(`${l.productCode}|${l.lotNo}|${l.locationCode}`, l.id);
  }

  // delta[lotId] = net change caused by movements AFTER the as-of day.
  const delta = new Map<string, number>();
  const add = (lotId: string | undefined, v: number) => {
    if (!lotId) return;
    delta.set(lotId, (delta.get(lotId) ?? 0) + v);
  };

  const [receiptLines, issueLines, adjLines, transferLines, countLines, returnLines] =
    await Promise.all([
      db.receiptLine.findMany({
        where: { receipt: { reversedAt: null, docDate: { gte: cutoff } }, lotId: { not: null } },
        select: { lotId: true, recvQty: true },
      }),
      db.issueLine.findMany({
        where: { issue: { reversedAt: null, docDate: { gte: cutoff } } },
        select: { selectedLotId: true, qty: true },
      }),
      db.adjustmentLine.findMany({
        where: { adjustment: { reversedAt: null, docDate: { gte: cutoff } } },
        select: { lotId: true, countedQty: true, sysQty: true },
      }),
      db.transferLine.findMany({
        where: { transfer: { reversedAt: null, docDate: { gte: cutoff } } },
        select: { lotId: true, qty: true, toLocationCode: true, lot: { select: { productCode: true, lotNo: true } } },
      }),
      db.stockCountLine.findMany({
        where: { stockCount: { reversedAt: null, docDate: { gte: cutoff } }, addedQty: { gt: 0 } },
        select: { lotId: true, addedQty: true },
      }),
      db.customerReturnLine.findMany({
        where: { customerReturn: { reversedAt: null, docDate: { gte: cutoff } }, lotId: { not: null } },
        select: { lotId: true, qty: true },
      }),
    ]);

  for (const r of receiptLines) add(r.lotId ?? undefined, r.recvQty);
  for (const r of returnLines) add(r.lotId ?? undefined, r.qty);
  for (const i of issueLines) add(i.selectedLotId ?? undefined, -i.qty);
  for (const a of adjLines) add(a.lotId, a.countedQty - a.sysQty);
  for (const c of countLines) add(c.lotId, c.addedQty); // off-system find created stock
  for (const t of transferLines) {
    add(t.lotId, -t.qty); // left the source lot
    const destId = byKey.get(`${t.lot.productCode}|${t.lot.lotNo}|${t.toLocationCode}`);
    add(destId, t.qty); // arrived at the destination lot
  }

  const result = new Map<string, number>();
  for (const [id, qty] of current) {
    result.set(id, qty - (delta.get(id) ?? 0));
  }
  return result;
}
