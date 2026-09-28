import "server-only";
import { db } from "@/lib/db";
import { eligibleLots } from "@/lib/calc/fefo";
import { productLabel } from "@/lib/calc/productName";

export type ShipLineRow = {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
  ordered: number;
  shipped: number;
  remaining: number;
};

export type ShipmentRow = {
  id: string;
  docNo: string;
  shippedDate: string;
  reversed: boolean;
  lines: {
    productCode: string;
    productName: string;
    lotNo: string;
    qty: number;
    unit: string;
  }[];
};

export type ShipRow = {
  id: string;
  no: string;
  status: "OPEN" | "PENDING" | "COMPLETE";
  customerId: string;
  customerName: string;
  shipToId: string | null;
  shipToLabel: string;
  shipToAddress: string;
  orderDate: string;
  requestedShipDate: string | null;
  tracking: string;
  remark: string;
  amount: number;
  shippedPct: number;
  lines: ShipLineRow[];
  shipments: ShipmentRow[];
};

export type ShipCustomer = {
  id: string;
  code: string;
  name: string;
  shipTos: { id: string; label: string; address: string; isDefault: boolean }[];
};

export type ShipProduct = {
  code: string;
  name: string;
  unit: string;
  price: number;
  onHand: number;
};

/** Active customers + their ship-to addresses, for the New Ship Order picker. */
export async function getShipCustomers(): Promise<ShipCustomer[]> {
  const customers = await db.customer.findMany({
    where: { active: true },
    include: { shipTos: { orderBy: [{ isDefault: "desc" }, { label: "asc" }] } },
    orderBy: { name: "asc" },
  });
  return customers.map((c) => ({
    id: c.id,
    code: c.code ?? "",
    name: c.name,
    shipTos: c.shipTos.map((s) => ({
      id: s.id,
      label: s.label,
      address: s.address,
      isDefault: s.isDefault,
    })),
  }));
}

/** Product picker with current sellable on-hand (sum of FEFO-eligible stock). */
export async function getShipProducts(): Promise<ShipProduct[]> {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    include: { lots: true },
    orderBy: { code: "asc" },
  });
  return products.map((p) => {
    const eligible = eligibleLots(
      p.lots.map((l) => ({
        id: l.id,
        lotNo: l.lotNo,
        qty: l.qty,
        status: l.status,
        expDate: l.expDate,
        mfgDate: l.mfgDate,
        recvDate: l.recvDate,
        locationCode: l.locationCode,
      }))
    );
    return {
      code: p.code,
      name: productLabel(p.nameEn, p.nameTh),
      unit: p.unit,
      price: p.price,
      onHand: eligible.reduce((s, l) => s + l.qty, 0),
    };
  });
}

export async function getShipOrders(opts?: { status?: string }): Promise<ShipRow[]> {
  const orders = await db.shipOrder.findMany({
    where: opts?.status ? { status: opts.status as never } : {},
    include: {
      customer: true,
      shipTo: true,
      lines: { include: { product: true } },
      issues: {
        include: { lines: { include: { product: true, selectedLot: true } } },
        orderBy: { docDate: "desc" },
      },
    },
    orderBy: { orderDate: "desc" },
  });

  return orders.map((so) => {
    const orderedTotal = so.lines.reduce((s, l) => s + l.ordered, 0);
    const shippedTotal = so.lines.reduce((s, l) => s + l.shipped, 0);
    const amount = so.lines.reduce((s, l) => s + l.ordered * l.product.price, 0);
    const shippedPct = orderedTotal > 0 ? (shippedTotal / orderedTotal) * 100 : 0;

    return {
      id: so.id,
      no: so.no,
      status: so.status,
      customerId: so.customerId,
      // Prefer the snapshot taken at order time; fall back to the live master.
      customerName: so.shipToName ?? so.customer.name,
      shipToId: so.shipToId,
      shipToLabel: so.shipTo?.label ?? "",
      shipToAddress: so.shipToAddress ?? so.shipTo?.address ?? "",
      orderDate: so.orderDate.toISOString(),
      requestedShipDate: so.requestedShipDate ? so.requestedShipDate.toISOString() : null,
      tracking: so.tracking ?? "",
      remark: so.remark ?? "",
      amount,
      shippedPct,
      lines: so.lines.map((l) => ({
        id: l.id,
        productCode: l.productCode,
        productName: productLabel(l.product.nameEn, l.product.nameTh),
        unit: l.product.unit,
        ordered: l.ordered,
        shipped: l.shipped,
        remaining: Math.max(0, l.ordered - l.shipped),
      })),
      shipments: so.issues.map((i) => ({
        id: i.id,
        docNo: i.docNo,
        shippedDate: (i.shippedDate ?? i.docDate).toISOString(),
        reversed: i.reversedAt !== null,
        lines: i.lines.map((l) => ({
          productCode: l.productCode,
          productName: productLabel(l.product.nameEn, l.product.nameTh),
          lotNo: l.selectedLot?.lotNo ?? "-",
          qty: l.qty,
          unit: l.product.unit,
        })),
      })),
    };
  });
}
