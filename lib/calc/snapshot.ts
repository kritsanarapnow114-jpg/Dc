import "server-only";
import { db } from "@/lib/db";
import { LotStatus } from "@prisma/client";

export type LotSnapshot = {
  id: string;
  productCode: string;
  qty: number;
  locationCode: string;
  status: LotStatus;
  expDate: Date | null;
  recvDate: Date;
};

/**
 * Reconstructs each lot's qty and location as of a given date, by walking
 * backward from current state: any Receipt/Issue/Adjustment/Transfer/Return event
 * dated *after* `asOf` is undone. Lots that didn't exist yet as of that date
 * (recvDate > asOf) are omitted entirely.
 *
 * Note: QC hold is a plain status flag with no change history, so it cannot
 * be reconstructed for a past date — callers needing "as of" QC status get
 * the lot's current status regardless of `asOf`.
 */
export async function getLotsAsOf(asOf: Date): Promise<LotSnapshot[]> {
  const [lots, laterReceiptLines, laterIssueLines, laterAdjLines, laterTransferLines, laterReturnLines] = await Promise.all([
    db.lot.findMany(),
    db.receiptLine.findMany({
      where: { receipt: { docDate: { gt: asOf }, reversedAt: null } },
      select: { lotId: true, recvQty: true },
    }),
    db.issueLine.findMany({
      where: { issue: { docDate: { gt: asOf }, reversedAt: null } },
      select: { selectedLotId: true, qty: true },
    }),
    db.adjustmentLine.findMany({
      where: { adjustment: { docDate: { gt: asOf }, reversedAt: null } },
      select: { lotId: true, sysQty: true, countedQty: true },
    }),
    db.transferLine.findMany({
      where: { transfer: { docDate: { gt: asOf }, reversedAt: null } },
      select: { lotId: true, fromLocationCode: true },
      orderBy: { transfer: { docDate: "asc" } },
    }),
    // Customer returns put stock back into a lot (RESTOCK / HOLD) — undo like a receipt.
    db.customerReturnLine.findMany({
      where: { customerReturn: { docDate: { gt: asOf }, reversedAt: null }, lotId: { not: null } },
      select: { lotId: true, qty: true },
    }),
  ]);

  const recvAfter = new Map<string, number>();
  for (const r of laterReceiptLines) {
    if (!r.lotId) continue;
    recvAfter.set(r.lotId, (recvAfter.get(r.lotId) ?? 0) + r.recvQty);
  }
  for (const r of laterReturnLines) {
    if (!r.lotId) continue;
    recvAfter.set(r.lotId, (recvAfter.get(r.lotId) ?? 0) + r.qty);
  }
  const issAfter = new Map<string, number>();
  for (const i of laterIssueLines) {
    if (!i.selectedLotId) continue;
    issAfter.set(i.selectedLotId, (issAfter.get(i.selectedLotId) ?? 0) + i.qty);
  }
  const adjAfter = new Map<string, number>();
  for (const a of laterAdjLines) {
    adjAfter.set(a.lotId, (adjAfter.get(a.lotId) ?? 0) + (a.countedQty - a.sysQty));
  }
  // First (earliest) after-cutoff transfer per lot tells us the location just before `asOf`.
  const locationBeforeCutoff = new Map<string, string>();
  for (const t of laterTransferLines) {
    if (!locationBeforeCutoff.has(t.lotId)) locationBeforeCutoff.set(t.lotId, t.fromLocationCode);
  }

  return lots
    .filter((l) => l.recvDate <= asOf)
    .map((l) => ({
      id: l.id,
      productCode: l.productCode,
      qty: Math.max(
        0,
        l.qty - (recvAfter.get(l.id) ?? 0) + (issAfter.get(l.id) ?? 0) - (adjAfter.get(l.id) ?? 0)
      ),
      locationCode: locationBeforeCutoff.get(l.id) ?? l.locationCode,
      status: l.status,
      expDate: l.expDate,
      recvDate: l.recvDate,
    }))
    .filter((l) => l.qty > 0);
}
