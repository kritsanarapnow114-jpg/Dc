import "server-only";
import { db } from "@/lib/db";
import { peekNextDocNumber } from "@/lib/calc/docNumber";
import { productLabel } from "@/lib/calc/productName";
import { fmtDateISO } from "@/lib/calc/date";
import { getAppSetting } from "@/lib/views/settings";
import { RETURN_REASONS_KEY, RETURN_REASONS_DEFAULTS, parseList } from "@/lib/settingsKeys";

/** How far back to offer shipments to return against. */
const SHIPMENT_LOOKBACK_DAYS = 180;

export async function getReturnFormData() {
  const since = new Date(Date.now() - SHIPMENT_LOOKBACK_DAYS * 86400000);
  const [products, locations, customers, shipments, docNo, reasonsRaw] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } }),
    db.location.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    db.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.issue.findMany({
      where: { issueType: "EXTERNAL", reversedAt: null, docDate: { gte: since } },
      include: { lines: { include: { product: true, selectedLot: true } }, shipOrder: true },
      orderBy: { docDate: "desc" },
      take: 300,
    }),
    peekNextDocNumber("RT"),
    getAppSetting(RETURN_REASONS_KEY),
  ]);

  const reasons = parseList(reasonsRaw);

  return {
    docNo,
    reasons: reasons.length > 0 ? reasons : RETURN_REASONS_DEFAULTS,
    products: products.map((p) => ({
      code: p.code,
      name: productLabel(p.nameEn, p.nameTh),
      unit: p.unit,
    })),
    locations: locations.map((l) => l.code),
    customers: customers.map((c) => ({ id: c.id, name: c.name, code: c.code ?? "" })),
    shipments: shipments.map((i) => ({
      id: i.id,
      docNo: i.docNo,
      docDate: i.docDate.toISOString(),
      customerId: i.customerId,
      customerName: i.shipToName ?? "",
      shipOrderNo: i.shipOrder?.no ?? "",
      lines: i.lines.map((l) => ({
        productCode: l.productCode,
        name: productLabel(l.product.nameEn, l.product.nameTh),
        unit: l.product.unit,
        lotNo: l.selectedLot?.lotNo ?? "-",
        // Where it was shipped from — a sensible default for putting it back.
        locationCode: l.selectedLot?.locationCode ?? "",
        mfgDate: l.selectedLot?.mfgDate ? fmtDateISO(l.selectedLot.mfgDate) : "",
        expDate: l.selectedLot?.expDate ? fmtDateISO(l.selectedLot.expDate) : "",
        qty: l.qty,
      })),
    })),
  };
}

export type ReturnFormData = Awaited<ReturnType<typeof getReturnFormData>>;

export async function getRecentReturns(limit = 300) {
  const returns = await db.customerReturn.findMany({
    include: { customer: true, issue: true, lines: { include: { product: true } } },
    orderBy: { docDate: "desc" },
    take: limit,
  });
  return returns.map((r) => ({
    id: r.id,
    docNo: r.docNo,
    docDate: r.docDate.toISOString(),
    customerName: r.customer?.name ?? "",
    issueDocNo: r.issue?.docNo ?? "",
    reason: r.reason,
    remark: r.remark ?? "",
    reversedAt: r.reversedAt ? r.reversedAt.toISOString() : null,
    lineCount: r.lines.length,
    lines: r.lines.map((l) => ({
      code: l.productCode,
      name: productLabel(l.product.nameEn, l.product.nameTh),
      unit: l.product.unit,
      lotNo: l.lotNo,
      locationCode: l.locationCode ?? "",
      qty: l.qty,
      disposition: l.disposition,
    })),
  }));
}
