import "server-only";
import { db } from "@/lib/db";
import { peekNextDocNumber } from "@/lib/calc/docNumber";
import { productLabel } from "@/lib/calc/productName";
import { fmtDateISO } from "@/lib/calc/date";

export async function getReceiveFormData() {
  const [products, pos, locations, lots, docNo] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
    }),
    db.purchaseOrder.findMany({
      where: { status: { not: "COMPLETE" } },
      include: { lines: { include: { product: true } } },
      orderBy: { no: "asc" },
    }),
    db.location.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    db.lot.findMany({ select: { lotNo: true }, distinct: ["lotNo"] }),
    peekNextDocNumber("RC"),
  ]);

  // Lots that already carry a Mfg and/or Expiry, newest first — so re-receiving a
  // known lot can auto-fill its production/expiry dates. Keyed both by
  // `product||lot` (exact match) and by `lot` alone (fallback across products);
  // newest wins because we iterate newest→oldest and only fill an empty key.
  const datedLots = await db.lot.findMany({
    where: { lotNo: { not: "-" }, OR: [{ mfgDate: { not: null } }, { expDate: { not: null } }] },
    select: { productCode: true, lotNo: true, mfgDate: true, expDate: true },
    orderBy: { recvDate: "desc" },
  });
  const lotMeta: Record<string, { mfg: string | null; exp: string | null }> = {};
  for (const l of datedLots) {
    const meta = {
      mfg: l.mfgDate ? fmtDateISO(l.mfgDate) : null,
      exp: l.expDate ? fmtDateISO(l.expDate) : null,
    };
    const exact = `${l.productCode}||${l.lotNo}`;
    if (!(exact in lotMeta)) lotMeta[exact] = meta;
    if (!(l.lotNo in lotMeta)) lotMeta[l.lotNo] = meta;
  }

  return {
    docNo,
    products: products.map((p) => ({
      code: p.code,
      name: productLabel(p.nameEn, p.nameTh),
      unit: p.unit,
      price: p.price,
      pallet: p.pallet, // standard pallet size — a Full pallet is received as this
      category: p.category,
    })),
    pos: pos.map((po) => ({
      id: po.id,
      no: po.no,
      vendor: po.vendor,
      lines: po.lines.map((l) => ({
        productCode: l.productCode,
        name: productLabel(l.product.nameEn, l.product.nameTh),
        unit: l.product.unit,
        ordered: l.ordered,
        received: l.received,
        remaining: Math.max(0, l.ordered - l.received),
      })),
    })),
    locations: locations.map((l) => l.code),
    lotOptions: lots.map((l) => l.lotNo).filter((l) => l !== "-"),
    lotMeta,
  };
}

export type ReceiveFormData = Awaited<ReturnType<typeof getReceiveFormData>>;

export async function getRecentReceipts(limit = 400) {
  const receipts = await db.receipt.findMany({
    include: {
      po: true,
      lines: { include: { product: true } },
    },
    orderBy: { docDate: "desc" },
    take: limit,
  });

  return receipts.map((r) => ({
    id: r.id,
    docNo: r.docNo,
    mode: r.mode,
    poNo: r.po?.no ?? null,
    invoiceNo: r.invoiceNo,
    materialDoc: r.materialDoc ?? "",
    remark: r.remark ?? "",
    docDate: r.docDate.toISOString(),
    reversedAt: r.reversedAt ? r.reversedAt.toISOString() : null,
    lineCount: r.lines.length,
    totalQty: r.lines.reduce((s, l) => s + l.recvQty, 0),
    lines: r.lines.map((l) => ({
      id: l.id,
      code: l.productCode,
      name: productLabel(l.product.nameEn, l.product.nameTh),
      lotNo: l.lotNo,
      locationCode: l.locationCode,
      recvQty: l.recvQty,
      mfgDate: l.mfgDate ? fmtDateISO(l.mfgDate) : "",
      expDate: l.expDate ? fmtDateISO(l.expDate) : "",
      unit: l.product.unit,
    })),
  }));
}

export type ReceiptHistoryRow = Awaited<ReturnType<typeof getRecentReceipts>>[number];
