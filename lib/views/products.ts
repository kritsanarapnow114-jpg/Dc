import "server-only";
import { db } from "@/lib/db";
import { CATEGORY_LABEL } from "@/components/ui/tone";
import { productLabel } from "@/lib/calc/productName";
import { autoLevels, USAGE_WINDOW_DAYS } from "@/lib/calc/reorder";

export type ProductRow = {
  code: string;
  nameEn: string;
  nameTh: string | null;
  category: string;
  categoryLabel: string;
  unit: string;
  price: number;
  pallet: number;
  onHand: number;
  totalValue: number;
  locations: string[];
  status: "ok" | "qc";
  lotCount: number;
  minQty: number; // manual override (0 = auto)
  maxQty: number; // manual override (0 = auto)
  autoMin: number; // suggested from usage + receiving
  autoMax: number;
  autoSafety: number; // suggested safety-stock buffer
};

/**
 * Auto reorder levels per product, derived from the last USAGE_WINDOW_DAYS of
 * real issuing (usage) and receiving. Recomputed on every call, so it always
 * reflects current activity. Reversed documents are excluded.
 */
export async function getAutoLevelsMap(
  codes?: string[]
): Promise<Map<string, { autoMin: number; autoMax: number; safety: number }>> {
  const windowStart = new Date(Date.now() - USAGE_WINDOW_DAYS * 86400000);
  const codeFilter = codes && codes.length ? { productCode: { in: codes } } : {};
  const [issued, recv, prods] = await Promise.all([
    db.issueLine.groupBy({
      by: ["productCode"],
      where: { ...codeFilter, issue: { docDate: { gte: windowStart }, reversedAt: null } },
      _sum: { qty: true },
    }),
    db.receiptLine.groupBy({
      by: ["productCode"],
      where: { ...codeFilter, receipt: { docDate: { gte: windowStart }, reversedAt: null } },
      _sum: { recvQty: true },
      _count: { _all: true },
    }),
    db.product.findMany({
      where: codes && codes.length ? { code: { in: codes } } : {},
      select: { code: true, pallet: true },
    }),
  ]);
  const issuedByCode = new Map(issued.map((r) => [r.productCode, r._sum.qty ?? 0]));
  const recvByCode = new Map(recv.map((r) => [r.productCode, { sum: r._sum.recvQty ?? 0, count: r._count._all }]));
  const packByCode = new Map(prods.map((p) => [p.code, p.pallet]));
  const map = new Map<string, { autoMin: number; autoMax: number; safety: number }>();
  for (const code of new Set([...issuedByCode.keys(), ...recvByCode.keys()])) {
    // Usage = issued (จ่ายออก).
    const avgDaily = (issuedByCode.get(code) ?? 0) / USAGE_WINDOW_DAYS;
    const rc = recvByCode.get(code);
    const avgReceipt = rc && rc.count > 0 ? rc.sum / rc.count : 0;
    map.set(code, autoLevels(avgDaily, avgReceipt, packByCode.get(code) ?? 0));
  }
  return map;
}

export async function getProductRows(opts?: {
  q?: string;
  category?: string;
}): Promise<ProductRow[]> {
  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      ...(opts?.category ? { category: opts.category as never } : {}),
      ...(opts?.q
        ? {
            OR: [
              { code: { contains: opts.q } },
              { nameEn: { contains: opts.q } },
              { nameTh: { contains: opts.q } },
            ],
          }
        : {}),
    },
    include: { lots: true },
    orderBy: { code: "asc" },
  });

  const autoMap = await getAutoLevelsMap();

  return products.map((p) => {
    // Depleted lots (qty 0) are ignored for on-hand, location, QC and lot count.
    const activeLots = p.lots.filter((l) => l.qty > 0);
    const onHand = activeLots.reduce((s, l) => s + l.qty, 0);
    const locations = [...new Set(activeLots.map((l) => l.locationCode))];
    const status: "ok" | "qc" = activeLots.some((l) => l.status === "QC")
      ? "qc"
      : "ok";
    return {
      code: p.code,
      nameEn: p.nameEn,
      nameTh: p.nameTh,
      category: p.category,
      categoryLabel: `${CATEGORY_LABEL[p.category].en} (${CATEGORY_LABEL[p.category].th})`,
      unit: p.unit,
      price: p.price,
      pallet: p.pallet,
      onHand,
      totalValue: onHand * p.price,
      locations,
      status,
      lotCount: activeLots.length,
      minQty: p.minQty,
      maxQty: p.maxQty,
      autoMin: autoMap.get(p.code)?.autoMin ?? 0,
      autoMax: autoMap.get(p.code)?.autoMax ?? 0,
      autoSafety: autoMap.get(p.code)?.safety ?? 0,
    };
  });
}

export type ProductDetail = ProductRow & {
  nameEnTh: string;
  width: number;
  length: number;
  stackLevels: number;
  containerType: string;
  lots: {
    id: string;
    ids: string[]; // every stock record merged into this row (same lot+loc+status)
    locationCode: string;
    lotNo: string;
    qty: number;
    status: "OK" | "QC";
    expDate: string | null;
    mfgDate: string | null;
    recvDate: string;
  }[];
};

type StoredLot = {
  id: string;
  locationCode: string;
  lotNo: string;
  qty: number;
  status: "OK" | "QC";
  expDate: Date | null;
  mfgDate: Date | null;
  recvDate: Date;
};

/** Collapse duplicate stock records of the same lot in the same location (and
 *  same QC status) into one row for the drawer — summing qty and keeping every
 *  underlying id so edit / QC-hold act on the whole group. */
function mergeStoredLots(lots: StoredLot[]) {
  const groups = new Map<string, StoredLot[]>();
  for (const l of lots) {
    const key = `${l.lotNo}||${l.locationCode}||${l.status}`;
    const g = groups.get(key);
    if (g) g.push(l);
    else groups.set(key, [l]);
  }
  return [...groups.values()].map((g) => {
    const first = g[0];
    return {
      id: first.id,
      ids: g.map((x) => x.id),
      locationCode: first.locationCode,
      lotNo: first.lotNo,
      qty: g.reduce((s, x) => s + x.qty, 0),
      status: first.status,
      expDate: first.expDate ? first.expDate.toISOString() : null,
      mfgDate: first.mfgDate ? first.mfgDate.toISOString() : null,
      recvDate: first.recvDate.toISOString(),
    };
  });
}

export async function getProductDetail(
  code: string
): Promise<ProductDetail | null> {
  const p = await db.product.findUnique({
    where: { code },
    include: { lots: { orderBy: { locationCode: "asc" } } },
  });
  if (!p) return null;
  const auto = (await getAutoLevelsMap([code])).get(code);
  // Hide depleted lots (qty 0) from the drawer's "Stored by Location / Lot" list.
  const activeLots = p.lots.filter((l) => l.qty > 0);
  const onHand = activeLots.reduce((s, l) => s + l.qty, 0);
  const status: "ok" | "qc" = activeLots.some((l) => l.status === "QC")
    ? "qc"
    : "ok";
  return {
    code: p.code,
    nameEn: p.nameEn,
    nameTh: p.nameTh,
    nameEnTh: productLabel(p.nameEn, p.nameTh),
    category: p.category,
    categoryLabel: `${CATEGORY_LABEL[p.category].en} (${CATEGORY_LABEL[p.category].th})`,
    unit: p.unit,
    price: p.price,
    pallet: p.pallet,
    width: p.width,
    length: p.length,
    stackLevels: p.stackLevels,
    containerType: p.containerType,
    onHand,
    totalValue: onHand * p.price,
    locations: [...new Set(activeLots.map((l) => l.locationCode))],
    status,
    lotCount: activeLots.length,
    minQty: p.minQty,
    maxQty: p.maxQty,
    autoMin: auto?.autoMin ?? 0,
    autoMax: auto?.autoMax ?? 0,
    autoSafety: auto?.safety ?? 0,
    lots: mergeStoredLots(activeLots),
  };
}
