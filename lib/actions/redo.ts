"use server";

import { db } from "@/lib/db";
import { fmtDateISO } from "@/lib/calc/date";
import { ReversibleKind } from "./reverse";

const PATH: Record<ReversibleKind, string> = {
  issue: "/issue",
  receipt: "/receive",
  adjustment: "/adjust",
  transfer: "/transfer",
  count: "/count",
  return: "/returns",
};

/** Build a prefill template from an existing document so the user can re-enter
 *  it as a fresh document (they review/edit, then confirm). Nothing is created
 *  or changed here — it only reads the original doc's lines. */
export async function getRedoTemplateAction(
  kind: ReversibleKind,
  id: string
): Promise<{ path: string; payload: unknown } | { error: string }> {
  if (kind === "issue") {
    const issue = await db.issue.findUnique({ where: { id }, include: { lines: true } });
    if (!issue) return { error: "Issue not found" };
    return {
      path: PATH.issue,
      payload: {
        issueTo: issue.issueTo,
        lines: issue.lines.map((l) => ({
          productCode: l.productCode,
          selectedLotId: l.selectedLotId ?? "",
          qty: l.qty,
        })),
      },
    };
  }

  if (kind === "receipt") {
    const r = await db.receipt.findUnique({ where: { id }, include: { lines: true } });
    if (!r) return { error: "Receipt not found" };
    return {
      path: PATH.receipt,
      payload: {
        poId: r.poId,
        invoiceNo: r.invoiceNo ?? "",
        lines: r.lines.map((l) => ({
          productCode: l.productCode,
          ordered: l.orderedQty ?? null,
          recv: String(l.recvQty),
          lot: l.lotNo,
          loc: l.locationCode,
          mfg: l.mfgDate ? fmtDateISO(l.mfgDate) : "",
          exp: l.expDate ? fmtDateISO(l.expDate) : "",
        })),
      },
    };
  }

  if (kind === "adjustment") {
    const a = await db.adjustment.findUnique({ where: { id }, include: { lines: true } });
    if (!a) return { error: "Adjustment not found" };
    return {
      path: PATH.adjustment,
      payload: {
        reason: a.reason,
        lines: a.lines.map((l) => ({ lotId: l.lotId, counted: String(l.countedQty) })),
      },
    };
  }

  if (kind === "transfer") {
    const t = await db.transfer.findUnique({ where: { id }, include: { lines: true } });
    if (!t) return { error: "Transfer not found" };
    return {
      path: PATH.transfer,
      payload: {
        lines: t.lines.map((l) => ({
          lotId: l.lotId,
          toLocationCode: l.toLocationCode,
          moveQty: String(l.qty),
        })),
      },
    };
  }

  if (kind === "return") {
    const r = await db.customerReturn.findUnique({ where: { id }, include: { lines: true } });
    if (!r) return { error: "Customer return not found" };
    return {
      path: PATH.return,
      payload: {
        customerId: r.customerId,
        issueId: r.issueId,
        reason: r.reason,
        remark: r.remark ?? "",
        lines: r.lines.map((l) => ({
          productCode: l.productCode,
          lotNo: l.lotNo,
          qty: String(l.qty),
          disposition: l.disposition,
          loc: l.locationCode ?? "",
          mfg: l.mfgDate ? fmtDateISO(l.mfgDate) : "",
          exp: l.expDate ? fmtDateISO(l.expDate) : "",
        })),
      },
    };
  }

  // count
  const c = await db.stockCount.findUnique({
    where: { id },
    include: { lines: { include: { lot: true } } },
  });
  if (!c) return { error: "Stock count not found" };
  return {
    path: PATH.count,
    payload: {
      pullZone: c.pullZone,
      lines: c.lines
        .filter((l) => l.addedQty <= 0)
        .map((l) => ({ lotId: l.lotId, counted: String(l.countedQty) })),
      offSystemLines: c.lines
        .filter((l) => l.addedQty > 0)
        .map((l) => ({
          productCode: l.lot.productCode,
          lotNo: l.lot.lotNo,
          locationCode: l.lot.locationCode,
          counted: String(l.addedQty),
        })),
    },
  };
}
