import "server-only";
import { db } from "@/lib/db";
import { productLabel } from "@/lib/calc/productName";

export async function getLotOptions() {
  // Only lots that still have stock — depleted (qty 0) lots are hidden from the
  // Transfer / Adjust / Count lot pickers.
  const lots = await db.lot.findMany({
    where: { qty: { gt: 0 } },
    include: { product: true },
    orderBy: [{ productCode: "asc" }, { locationCode: "asc" }],
  });
  return lots.map((l) => ({
    id: l.id,
    productCode: l.productCode,
    name: productLabel(l.product.nameEn, l.product.nameTh),
    unit: l.product.unit,
    price: l.product.price,
    lotNo: l.lotNo,
    locationCode: l.locationCode,
    qty: l.qty,
    status: l.status,
  }));
}

export type LotOption = Awaited<ReturnType<typeof getLotOptions>>[number];

/**
 * Lot options for the Put-Away / Transfer picker, with the same physical pile —
 * same product + lot + location + status — collapsed into ONE option (summing
 * on-hand). Otherwise a lot split across several stock records (e.g. finished
 * goods put away pallet-by-pallet) forces one picker line per record, which is
 * painful to move. The option id is the earliest-received record of the group;
 * confirmTransferAction draws the requested qty across every record of the group.
 */
export async function getMergedLotOptions(): Promise<LotOption[]> {
  const lots = await db.lot.findMany({
    where: { qty: { gt: 0 } },
    include: { product: true },
    orderBy: [{ productCode: "asc" }, { locationCode: "asc" }, { recvDate: "asc" }],
  });
  const groups = new Map<string, { head: (typeof lots)[number]; qty: number }>();
  for (const l of lots) {
    const key = `${l.productCode}||${l.lotNo}||${l.locationCode}||${l.status}`;
    const g = groups.get(key);
    if (g) g.qty += l.qty; // earliest-received stays the head (recvDate asc)
    else groups.set(key, { head: l, qty: l.qty });
  }
  return [...groups.values()].map(({ head, qty }) => ({
    id: head.id,
    productCode: head.productCode,
    name: productLabel(head.product.nameEn, head.product.nameTh),
    unit: head.product.unit,
    price: head.product.price,
    lotNo: head.lotNo,
    locationCode: head.locationCode,
    qty,
    status: head.status,
  }));
}

export async function getLocationCodes() {
  const locs = await db.location.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } });
  return locs.map((l) => l.code);
}

export async function getProductOptions() {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });
  return products.map((p) => ({
    code: p.code,
    name: productLabel(p.nameEn, p.nameTh),
    unit: p.unit,
  }));
}

export type ProductOption = Awaited<ReturnType<typeof getProductOptions>>[number];

export async function getRecentAdjustments(limit = 400) {
  const rows = await db.adjustment.findMany({
    include: { lines: { include: { lot: { include: { product: true } } } } },
    orderBy: { docDate: "desc" },
    take: limit,
  });
  return rows.map((a) => ({
    id: a.id,
    docNo: a.docNo,
    docDate: a.docDate.toISOString(),
    reversedAt: a.reversedAt ? a.reversedAt.toISOString() : null,
    reason: a.reason,
    note: a.note ?? null,
    lineCount: a.lines.length,
    lines: a.lines.map((l) => ({
      code: l.lot.productCode,
      name: productLabel(l.lot.product.nameEn, l.lot.product.nameTh),
      lotNo: l.lot.lotNo,
      locationCode: l.lot.locationCode,
      sysQty: l.sysQty,
      countedQty: l.countedQty,
      unit: l.lot.product.unit,
    })),
  }));
}

export async function getRecentTransfers(limit = 400) {
  const rows = await db.transfer.findMany({
    include: { lines: { include: { lot: { include: { product: true } } } } },
    orderBy: { docDate: "desc" },
    take: limit,
  });
  return rows.map((t) => ({
    id: t.id,
    docNo: t.docNo,
    docDate: t.docDate.toISOString(),
    reversedAt: t.reversedAt ? t.reversedAt.toISOString() : null,
    operator: t.operator,
    lineCount: t.lines.length,
    lines: t.lines.map((l) => ({
      code: l.lot.productCode,
      name: productLabel(l.lot.product.nameEn, l.lot.product.nameTh),
      lotNo: l.lot.lotNo,
      fromLocationCode: l.fromLocationCode,
      toLocationCode: l.toLocationCode,
      qty: l.qty,
      unit: l.lot.product.unit,
    })),
  }));
}

export async function getRecentCounts(limit = 400) {
  const rows = await db.stockCount.findMany({
    include: { lines: { include: { lot: { include: { product: true } } } } },
    orderBy: { docDate: "desc" },
    take: limit,
  });
  return rows.map((c) => ({
    id: c.id,
    docNo: c.docNo,
    docDate: c.docDate.toISOString(),
    reversedAt: c.reversedAt ? c.reversedAt.toISOString() : null,
    pullZone: c.pullZone,
    lineCount: c.lines.length,
    lines: c.lines.map((l) => ({
      code: l.lot.productCode,
      name: productLabel(l.lot.product.nameEn, l.lot.product.nameTh),
      lotNo: l.lot.lotNo,
      locationCode: l.lot.locationCode,
      sysQty: l.sysQty,
      countedQty: l.countedQty,
      unit: l.lot.product.unit,
    })),
  }));
}
