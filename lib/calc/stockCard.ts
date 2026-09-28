import "server-only";
import { db } from "@/lib/db";

export type StockCardEntryType =
  | "Receive"
  | "Issue"
  | "Adjust"
  | "Transfer"
  | "Return";

export type StockCardEntry = {
  date: Date;
  doc: string;
  type: StockCardEntryType;
  lot: string;
  in: number;
  out: number;
  balance: number;
};

/**
 * Real chronological movement ledger for a product, built from the actual
 * Receipt/Issue/Adjustment/Transfer/Return records that touched it (not synthesized).
 * Transfers move a lot between bins — they don't change the product's total
 * on-hand, so they net to zero but still appear as a row for traceability.
 */
export async function buildStockCard(
  productCode: string
): Promise<StockCardEntry[]> {
  const [receiptLines, issueLines, adjustmentLines, transferLines, returnLines] =
    await Promise.all([
      db.receiptLine.findMany({
        where: { productCode, receipt: { reversedAt: null } },
        include: { receipt: true },
      }),
      db.issueLine.findMany({
        where: { productCode, issue: { reversedAt: null } },
        include: { issue: true, selectedLot: true },
      }),
      db.adjustmentLine.findMany({
        where: { lot: { productCode }, adjustment: { reversedAt: null } },
        include: { adjustment: true, lot: true },
      }),
      db.transferLine.findMany({
        where: { lot: { productCode }, transfer: { reversedAt: null } },
        include: { transfer: true, lot: true },
      }),
      // Customer returns that put goods back into stock (SCRAP lines never do).
      db.customerReturnLine.findMany({
        where: { productCode, lotId: { not: null }, customerReturn: { reversedAt: null } },
        include: { customerReturn: true },
      }),
    ]);

  const entries: StockCardEntry[] = [];

  for (const r of receiptLines) {
    entries.push({
      date: r.receipt.docDate,
      doc: r.receipt.docNo,
      type: "Receive",
      lot: r.lotNo,
      in: r.recvQty,
      out: 0,
      balance: 0,
    });
  }
  for (const i of issueLines) {
    entries.push({
      date: i.issue.docDate,
      doc: i.issue.docNo,
      type: "Issue",
      lot: i.selectedLot?.lotNo ?? "-",
      in: 0,
      out: i.qty,
      balance: 0,
    });
  }
  for (const a of adjustmentLines) {
    const variance = a.countedQty - a.sysQty;
    entries.push({
      date: a.adjustment.docDate,
      doc: a.adjustment.docNo,
      type: "Adjust",
      lot: a.lot.lotNo,
      in: variance > 0 ? variance : 0,
      out: variance < 0 ? -variance : 0,
      balance: 0,
    });
  }
  for (const t of transferLines) {
    entries.push({
      date: t.transfer.docDate,
      doc: t.transfer.docNo,
      type: "Transfer",
      lot: t.lot.lotNo,
      in: 0,
      out: 0,
      balance: 0,
    });
  }
  for (const r of returnLines) {
    entries.push({
      date: r.customerReturn.docDate,
      doc: r.customerReturn.docNo,
      type: "Return",
      lot: r.lotNo,
      in: r.qty,
      out: 0,
      balance: 0,
    });
  }

  // Transfers move a lot between bins without changing the product's total, so
  // they're pure noise on a product-level card — drop them.
  const kept = entries.filter((e) => e.type !== "Transfer");

  // Collapse only the split lines OF THE SAME DOCUMENT for one lot on one day into
  // a single row (summed qty). Different documents keep their own rows — the doc
  // number is part of the key.
  const groups = new Map<string, { base: StockCardEntry; docs: Set<string> }>();
  for (const e of kept) {
    const dayKey = e.date.toISOString().slice(0, 10);
    const key = `${dayKey}|${e.lot}|${e.type}|${e.doc}`;
    const g = groups.get(key);
    if (g) {
      g.base.in += e.in;
      g.base.out += e.out;
      g.docs.add(e.doc);
    } else {
      groups.set(key, { base: { ...e }, docs: new Set([e.doc]) });
    }
  }
  const merged = [...groups.values()].map(({ base, docs }) => {
    const list = [...docs];
    base.doc = list.length === 1 ? list[0] : list.join(", ");
    return base;
  });

  merged.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  for (const e of merged) {
    balance += e.in - e.out;
    e.balance = balance;
  }

  return merged;
}
