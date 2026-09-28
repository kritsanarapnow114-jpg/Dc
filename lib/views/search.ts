import "server-only";
import { db } from "@/lib/db";
import { productLabel } from "@/lib/calc/productName";
import { fmtDateBE } from "@/lib/calc/date";

export type SearchHit = {
  title: string;
  subtitle: string;
  tag: string; // group tag
  href: string;
};

export type SearchResults = {
  q: string;
  groups: { label: string; hits: SearchHit[] }[];
  total: number;
};

const LIMIT = 25;

export async function searchAll(qRaw: string): Promise<SearchResults> {
  const q = qRaw.trim();
  if (!q) return { q, groups: [], total: 0 };
  const like = { contains: q, mode: "insensitive" as const };

  const [products, pos, receipts, issues, lots] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null, OR: [{ code: like }, { nameEn: like }, { nameTh: like }] },
      take: LIMIT,
      orderBy: { code: "asc" },
    }),
    db.purchaseOrder.findMany({
      where: { OR: [{ no: like }, { vendor: like }] },
      take: LIMIT,
      orderBy: { date: "desc" },
    }),
    db.receipt.findMany({
      where: { OR: [{ docNo: like }, { invoiceNo: like }, { materialDoc: like }] },
      take: LIMIT,
      orderBy: { docDate: "desc" },
    }),
    db.issue.findMany({
      where: { OR: [{ docNo: like }, { materialDoc: like }] },
      take: LIMIT,
      orderBy: { docDate: "desc" },
    }),
    db.lot.findMany({
      where: { lotNo: like },
      include: { product: true },
      take: LIMIT,
      orderBy: { recvDate: "desc" },
    }),
  ]);

  const groups: SearchResults["groups"] = [];

  if (products.length)
    groups.push({
      label: "สินค้า · Products",
      hits: products.map((p) => ({
        title: `${p.code} · ${productLabel(p.nameEn, p.nameTh)}`,
        subtitle: `หมวด ${p.category} · ${p.unit}`,
        tag: "Product",
        href: `/products?q=${encodeURIComponent(p.code)}`,
      })),
    });

  if (pos.length)
    groups.push({
      label: "ใบสั่งซื้อ · Purchase Orders",
      hits: pos.map((p) => ({
        title: `${p.no} · ${p.vendor}`,
        subtitle: `วันที่ ${fmtDateBE(p.date)} · ${p.status}`,
        tag: "PO",
        href: `/po?q=${encodeURIComponent(p.no)}`,
      })),
    });

  if (receipts.length)
    groups.push({
      label: "รับเข้า / Invoice / Material Document · Receiving",
      hits: receipts.map((r) => ({
        title: `${r.docNo}${r.invoiceNo ? ` · Invoice ${r.invoiceNo}` : ""}${r.materialDoc ? ` · Mat.Doc ${r.materialDoc}` : ""}`,
        subtitle: `รับเข้า ${fmtDateBE(r.docDate)} · ${r.mode}`,
        tag: "GR",
        href: `/reports?q=${encodeURIComponent(r.docNo)}`,
      })),
    });

  if (issues.length)
    groups.push({
      label: "จ่ายออก / Material Document · Issuing",
      hits: issues.map((i) => ({
        title: `${i.docNo}${i.materialDoc ? ` · Mat.Doc ${i.materialDoc}` : ""}`,
        subtitle: `จ่ายไปที่ ${i.issueTo} · ${fmtDateBE(i.docDate)}`,
        tag: "GI",
        href: `/reports?q=${encodeURIComponent(i.docNo)}`,
      })),
    });

  if (lots.length)
    groups.push({
      label: "ล็อต · Lots",
      hits: lots.map((l) => ({
        title: `Lot ${l.lotNo} · ${productLabel(l.product.nameEn, l.product.nameTh)}`,
        subtitle: `${l.productCode} · ${l.locationCode} · คงเหลือ ${l.qty.toLocaleString()}`,
        tag: "Lot",
        href: `/products?q=${encodeURIComponent(l.productCode)}`,
      })),
    });

  return { q, groups, total: groups.reduce((s, g) => s + g.hits.length, 0) };
}
