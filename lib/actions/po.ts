"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { nextDocNumber } from "@/lib/calc/docNumber";

export type FormState = { error?: string; no?: string };

function revalidatePoPaths() {
  revalidatePath("/po");
  revalidatePath("/dashboard");
}

export type NewPoLine = { productCode: string; ordered: number };

export type CreatePoInput = {
  no?: string;
  vendor: string;
  date: string;
  lines: NewPoLine[];
};

export async function createPoAction(input: CreatePoInput): Promise<FormState> {
  const vendor = input.vendor.trim() || "(New draft) set vendor";

  let no = input.no?.trim();
  if (no) {
    const existing = await db.purchaseOrder.findUnique({ where: { no } });
    if (existing) {
      return { error: `PO number "${no}" already exists (เลข PO นี้มีอยู่แล้ว)` };
    }
  } else {
    no = await nextDocNumber("PO");
  }

  await db.purchaseOrder.create({
    data: {
      no,
      vendor,
      date: new Date(input.date),
      status: "OPEN",
      lines: {
        create: input.lines
          .filter((l) => l.ordered > 0)
          .map((l) => ({ productCode: l.productCode, ordered: l.ordered, received: 0 })),
      },
    },
  });

  revalidatePoPaths();
  return { no };
}

/** Edit an existing PO's header fields (vendor / doc date) from its detail modal. */
export async function updatePoAction(
  poId: string,
  input: { vendor?: string; date?: string }
): Promise<{ error?: string }> {
  const po = await db.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) return { error: "PO not found" };

  const data: { vendor?: string; date?: Date } = {};
  if (input.vendor !== undefined) data.vendor = input.vendor.trim() || po.vendor;
  if (input.date) data.date = new Date(input.date);

  await db.purchaseOrder.update({ where: { id: poId }, data });
  revalidatePoPaths();
  return {};
}

/** Update the ordered quantity of existing PO lines; recomputes PO status.
 *  A line set to 0 (or blank) is removed from the PO. */
export async function updatePoLineQtysAction(
  poId: string,
  updates: { lineId: string; ordered: number }[]
): Promise<{ error?: string }> {
  const po = await db.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
  if (!po) return { error: "PO not found" };
  const lineIds = new Set(po.lines.map((l) => l.id));

  await db.$transaction(async (tx) => {
    for (const u of updates) {
      if (!lineIds.has(u.lineId)) continue;
      if (u.ordered <= 0) {
        await tx.purchaseOrderLine.delete({ where: { id: u.lineId } });
      } else {
        await tx.purchaseOrderLine.update({
          where: { id: u.lineId },
          data: { ordered: u.ordered },
        });
      }
    }
    const fresh = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
    if (fresh) {
      const allDone = fresh.lines.every((l) => l.received >= l.ordered);
      const anyReceived = fresh.lines.some((l) => l.received > 0);
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: allDone ? "COMPLETE" : anyReceived ? "PENDING" : "OPEN" },
      });
    }
  });

  revalidatePoPaths();
  return {};
}

/** Add product lines to an existing PO (from the PO detail modal). Merges into
 *  an existing line for the same product; recomputes the PO status. */
export async function addPoLinesAction(
  poId: string,
  lines: { productCode: string; ordered: number }[]
): Promise<{ error?: string }> {
  const po = await db.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
  if (!po) return { error: "PO not found" };

  const toAdd = lines.filter((l) => l.ordered > 0);
  if (toAdd.length === 0) return { error: "Enter a quantity (กรอกจำนวน)" };

  await db.$transaction(async (tx) => {
    for (const l of toAdd) {
      const existing = po.lines.find((x) => x.productCode === l.productCode);
      if (existing) {
        await tx.purchaseOrderLine.update({
          where: { id: existing.id },
          data: { ordered: existing.ordered + l.ordered },
        });
      } else {
        await tx.purchaseOrderLine.create({
          data: { poId, productCode: l.productCode, ordered: l.ordered, received: 0 },
        });
      }
    }
    const fresh = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
    if (fresh) {
      const allDone = fresh.lines.every((l) => l.received >= l.ordered);
      const anyReceived = fresh.lines.some((l) => l.received > 0);
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: allDone ? "COMPLETE" : anyReceived ? "PENDING" : "OPEN" },
      });
    }
  });

  revalidatePoPaths();
  return {};
}

export async function deletePoAction(id: string): Promise<{ error?: string }> {
  const receiptCount = await db.receipt.count({ where: { poId: id } });
  if (receiptCount > 0) {
    return {
      error: "Cannot delete — this PO already has receipts against it (มีการรับสินค้าตาม PO นี้แล้ว ลบไม่ได้)",
    };
  }
  await db.purchaseOrder.delete({ where: { id } });
  revalidatePoPaths();
  return {};
}
