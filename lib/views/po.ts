import "server-only";
import { db } from "@/lib/db";
import { productLabel } from "@/lib/calc/productName";

export type PoLineRow = {
  id: string;
  productCode: string;
  productName: string;
  ordered: number;
  received: number;
  remaining: number;
};

export type PoReceiptRow = {
  id: string;
  docNo: string;
  docDate: string;
  invoiceNo: string | null;
  lines: {
    productCode: string;
    productName: string;
    lotNo: string;
    qty: number;
    unit: string;
  }[];
};

export type PoRow = {
  id: string;
  no: string;
  vendor: string;
  date: string;
  status: "OPEN" | "PENDING" | "COMPLETE";
  amount: number;
  receivedPct: number;
  lines: PoLineRow[];
  receipts: PoReceiptRow[];
};

export async function getProductPickerList() {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });
  return products.map((p) => ({
    code: p.code,
    name: productLabel(p.nameEn, p.nameTh),
    unit: p.unit,
    price: p.price,
  }));
}

/** Distinct vendor names used on past POs, for the New PO vendor autocomplete. */
export async function getVendorNames(): Promise<string[]> {
  const rows = await db.purchaseOrder.findMany({
    where: { vendor: { not: "" } },
    distinct: ["vendor"],
    select: { vendor: true },
    orderBy: { vendor: "asc" },
  });
  return rows.map((r) => r.vendor);
}

export async function getPurchaseOrders(opts?: {
  status?: string;
}): Promise<PoRow[]> {
  const pos = await db.purchaseOrder.findMany({
    where: opts?.status ? { status: opts.status as never } : {},
    include: {
      lines: { include: { product: true } },
      receipts: {
        where: { reversedAt: null },
        include: { lines: { include: { product: true } } },
        orderBy: { docDate: "desc" },
      },
    },
    orderBy: { date: "desc" },
  });

  return pos.map((po) => {
    const orderedTotal = po.lines.reduce((s, l) => s + l.ordered, 0);
    const receivedTotal = po.lines.reduce((s, l) => s + l.received, 0);
    const amount = po.lines.reduce(
      (s, l) => s + l.ordered * l.product.price,
      0
    );
    const receivedPct =
      orderedTotal > 0 ? (receivedTotal / orderedTotal) * 100 : 0;

    return {
      id: po.id,
      no: po.no,
      vendor: po.vendor,
      date: po.date.toISOString(),
      status: po.status,
      amount,
      receivedPct,
      lines: po.lines.map((l) => ({
        id: l.id,
        productCode: l.productCode,
        productName: l.product.nameEn,
        ordered: l.ordered,
        received: l.received,
        remaining: l.ordered - l.received,
      })),
      receipts: po.receipts.map((r) => ({
        id: r.id,
        docNo: r.docNo,
        docDate: r.docDate.toISOString(),
        invoiceNo: r.invoiceNo,
        lines: r.lines.map((l) => ({
          productCode: l.productCode,
          productName: l.product.nameEn,
          lotNo: l.lotNo,
          qty: l.recvQty,
          unit: l.product.unit,
        })),
      })),
    };
  });
}
