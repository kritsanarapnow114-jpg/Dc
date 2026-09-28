"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";
import { eligibleLots, fefoLotFor } from "@/lib/calc/fefo";

export type FormState = { error?: string; no?: string };

function revalidateShipPaths() {
  safeRevalidate(["/ship", "/dashboard"]);
}

/** Revalidate everything a shipment touches (stock is deducted on ship). */
function revalidateAfterShip() {
  safeRevalidate([
    "/ship",
    "/issue",
    "/dashboard",
    "/products",
    "/aging",
    "/locations",
    "/map",
  ]);
}

type Status = "OPEN" | "PENDING" | "COMPLETE";

function computeStatus(lines: { ordered: number; shipped: number }[]): Status {
  const allShipped = lines.length > 0 && lines.every((l) => l.shipped >= l.ordered);
  const anyShipped = lines.some((l) => l.shipped > 0);
  return allShipped ? "COMPLETE" : anyShipped ? "PENDING" : "OPEN";
}

export type NewShipLine = { productCode: string; ordered: number };

export type CreateShipOrderInput = {
  no?: string;
  customerId: string;
  shipToId?: string | null;
  orderDate: string;
  requestedShipDate?: string | null;
  tracking?: string | null;
  remark?: string | null;
  lines: NewShipLine[];
};

export async function createShipOrderAction(
  input: CreateShipOrderInput
): Promise<FormState> {
  try {
    await requireWrite();

    if (!input.customerId) {
      return { error: "กรุณาเลือกลูกค้า (a ship order needs a customer)" };
    }
    const customer = await db.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) return { error: "ไม่พบลูกค้า (customer not found)" };

    const shipTo = input.shipToId
      ? await db.shipToAddress.findUnique({ where: { id: input.shipToId } })
      : null;
    // Only trust a ship-to that actually belongs to the chosen customer.
    const shipToValid = shipTo && shipTo.customerId === customer.id ? shipTo : null;

    let no = input.no?.trim();
    if (no) {
      const existing = await db.shipOrder.findUnique({ where: { no } });
      if (existing) {
        return { error: `Ship order number "${no}" already exists (เลขออเดอร์นี้มีอยู่แล้ว)` };
      }
    } else {
      no = await nextDocNumber("SO");
    }

    await db.shipOrder.create({
      data: {
        no,
        status: "OPEN",
        customerId: customer.id,
        shipToId: shipToValid?.id ?? null,
        shipToName: customer.name,
        shipToAddress: shipToValid?.address ?? null,
        orderDate: new Date(input.orderDate),
        requestedShipDate: input.requestedShipDate ? new Date(input.requestedShipDate) : null,
        tracking: input.tracking?.trim() || null,
        remark: input.remark?.trim() || null,
        lines: {
          create: input.lines
            .filter((l) => l.ordered > 0)
            .map((l) => ({ productCode: l.productCode, ordered: l.ordered, shipped: 0 })),
        },
      },
    });

    revalidateShipPaths();
    return { no };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create ship order." };
  }
}

/** Edit a ship order's header (ship-to / dates / tracking / remark). */
export async function updateShipOrderAction(
  soId: string,
  input: {
    shipToId?: string | null;
    orderDate?: string;
    requestedShipDate?: string | null;
    tracking?: string | null;
    remark?: string | null;
  }
): Promise<{ error?: string }> {
  try {
    await requireWrite();
    const so = await db.shipOrder.findUnique({ where: { id: soId } });
    if (!so) return { error: "Ship order not found" };

    const data: {
      shipToId?: string | null;
      shipToAddress?: string | null;
      orderDate?: Date;
      requestedShipDate?: Date | null;
      tracking?: string | null;
      remark?: string | null;
    } = {};

    if (input.shipToId !== undefined) {
      const shipTo = input.shipToId
        ? await db.shipToAddress.findUnique({ where: { id: input.shipToId } })
        : null;
      const valid = shipTo && shipTo.customerId === so.customerId ? shipTo : null;
      data.shipToId = valid?.id ?? null;
      data.shipToAddress = valid?.address ?? null;
    }
    if (input.orderDate) data.orderDate = new Date(input.orderDate);
    if (input.requestedShipDate !== undefined) {
      data.requestedShipDate = input.requestedShipDate ? new Date(input.requestedShipDate) : null;
    }
    if (input.tracking !== undefined) data.tracking = input.tracking?.trim() || null;
    if (input.remark !== undefined) data.remark = input.remark?.trim() || null;

    await db.shipOrder.update({ where: { id: soId }, data });
    revalidateShipPaths();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update ship order." };
  }
}

/** Change ordered quantities on an OPEN ship order; a line set to 0 is removed.
 *  Only allowed before anything ships (once shipped, quantities are locked). */
export async function updateShipLineQtysAction(
  soId: string,
  updates: { lineId: string; ordered: number }[]
): Promise<{ error?: string }> {
  try {
    await requireWrite();
    const so = await db.shipOrder.findUnique({ where: { id: soId }, include: { lines: true } });
    if (!so) return { error: "Ship order not found" };
    if (so.status !== "OPEN") {
      return { error: "แก้จำนวนได้เฉพาะออเดอร์ที่ยังไม่ได้จัดส่ง (edit qty only before shipping)" };
    }
    const lineIds = new Set(so.lines.map((l) => l.id));

    await db.$transaction(async (tx) => {
      for (const u of updates) {
        if (!lineIds.has(u.lineId)) continue;
        if (u.ordered <= 0) {
          await tx.shipOrderLine.delete({ where: { id: u.lineId } });
        } else {
          await tx.shipOrderLine.update({ where: { id: u.lineId }, data: { ordered: u.ordered } });
        }
      }
    });

    revalidateShipPaths();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update lines." };
  }
}

/** Add product lines to an OPEN ship order (merges into an existing line). */
export async function addShipLinesAction(
  soId: string,
  lines: { productCode: string; ordered: number }[]
): Promise<{ error?: string }> {
  try {
    await requireWrite();
    const so = await db.shipOrder.findUnique({ where: { id: soId }, include: { lines: true } });
    if (!so) return { error: "Ship order not found" };
    if (so.status !== "OPEN") {
      return { error: "เพิ่มรายการได้เฉพาะออเดอร์ที่ยังไม่ได้จัดส่ง (add lines only before shipping)" };
    }

    const toAdd = lines.filter((l) => l.ordered > 0);
    if (toAdd.length === 0) return { error: "Enter a quantity (กรอกจำนวน)" };

    await db.$transaction(async (tx) => {
      for (const l of toAdd) {
        const existing = so.lines.find((x) => x.productCode === l.productCode);
        if (existing) {
          await tx.shipOrderLine.update({
            where: { id: existing.id },
            data: { ordered: existing.ordered + l.ordered },
          });
        } else {
          await tx.shipOrderLine.create({
            data: { soId, productCode: l.productCode, ordered: l.ordered, shipped: 0 },
          });
        }
      }
    });

    revalidateShipPaths();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add lines." };
  }
}

export async function deleteShipOrderAction(id: string): Promise<{ error?: string }> {
  try {
    await requireWrite();
    const shipmentCount = await db.issue.count({ where: { shipOrderId: id } });
    if (shipmentCount > 0) {
      return {
        error: "ลบไม่ได้ — ออเดอร์นี้มีการจัดส่งแล้ว (this ship order already has shipments)",
      };
    }
    await db.shipOrder.delete({ where: { id } });
    revalidateShipPaths();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete ship order." };
  }
}

export type ShipFulfillInput = {
  soId: string;
  docDate: string;
  tracking?: string | null;
  lines: { lineId: string; qty: number }[];
};

/**
 * Confirm a shipment for a ship order. For each line's requested qty, deduct
 * stock FEFO-first across the product's eligible lots, create one EXTERNAL goods
 * Issue (linked back to the order) capturing the deductions, bump the shipped
 * quantity on each line, and recompute the order status. All-or-nothing.
 */
export async function fulfillShipOrderAction(
  input: ShipFulfillInput
): Promise<{ docNo?: string; error?: string }> {
  const docDate = new Date(input.docDate);
  try {
    await requireWrite();

    const so = await db.shipOrder.findUnique({
      where: { id: input.soId },
      include: { lines: true, customer: true },
    });
    if (!so) return { error: "Ship order not found" };
    if (so.status === "COMPLETE") return { error: "ออเดอร์นี้จัดส่งครบแล้ว (already fully shipped)" };

    const byLineId = new Map(so.lines.map((l) => [l.id, l]));
    const toShip = input.lines
      .map((r) => ({ line: byLineId.get(r.lineId), qty: r.qty }))
      .filter((r): r is { line: (typeof so.lines)[number]; qty: number } => !!r.line && r.qty > 0);

    if (toShip.length === 0) return { error: "ไม่มีรายการที่จะจัดส่ง (nothing to ship)" };

    for (const { line, qty } of toShip) {
      const remaining = line.ordered - line.shipped;
      if (qty > remaining + 1e-9) {
        return {
          error: `จำนวนจัดส่งเกินยอดค้าง (${line.productCode}: ค้าง ${remaining.toLocaleString()}, ขอส่ง ${qty.toLocaleString()})`,
        };
      }
    }

    const docNo = await nextDocNumber("ISS", docDate);

    await db.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          docNo,
          issueType: "EXTERNAL",
          issueTo: "ขายออกภายนอก (External)",
          customerId: so.customerId,
          shipToId: so.shipToId,
          shipToName: so.shipToName ?? so.customer.name,
          shipToAddress: so.shipToAddress,
          remark: `Ship order ${so.no}`,
          docDate,
          shippedDate: docDate,
          shipOrderId: so.id,
        },
      });

      for (const { line, qty } of toShip) {
        const allLots = await tx.lot.findMany({ where: { productCode: line.productCode } });
        const fefo = fefoLotFor(
          allLots.map((l) => ({
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
        // Draw FEFO-first across every eligible stock record of this product.
        const ordered = eligibleLots(
          allLots.map((l) => ({
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
        const avail = ordered.reduce((s, l) => s + l.qty, 0);
        if (avail < qty) {
          throw new Error(
            `สต็อกไม่พอสำหรับ ${line.productCode} (มี ${avail.toLocaleString()}, ขอส่ง ${qty.toLocaleString()})`
          );
        }

        let need = qty;
        for (const s of ordered) {
          if (need <= 0) break;
          const take = Math.min(s.qty, need);
          await tx.lot.update({ where: { id: s.id }, data: { qty: { decrement: take } } });
          await tx.issueLine.create({
            data: {
              issueId: issue.id,
              productCode: line.productCode,
              fefoLotId: fefo?.id ?? null,
              selectedLotId: s.id,
              qty: take,
            },
          });
          need -= take;
        }

        await tx.shipOrderLine.update({
          where: { id: line.id },
          data: { shipped: line.shipped + qty },
        });
      }

      // Recompute status from the fresh (post-shipment) line quantities.
      const fresh = await tx.shipOrderLine.findMany({ where: { soId: so.id } });
      const status = computeStatus(fresh);
      await tx.shipOrder.update({
        where: { id: so.id },
        data: {
          status,
          ...(input.tracking?.trim() ? { tracking: input.tracking.trim() } : {}),
        },
      });
    });

    revalidateAfterShip();
    return { docNo };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to confirm shipment." };
  }
}
