"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";
import { AdjustReason } from "@prisma/client";

export type AdjustLineInput = { lotId: string; countedQty: number };
export type ConfirmAdjustInput = {
  reason: AdjustReason;
  docDate: string;
  note?: string;
  lines: AdjustLineInput[];
};

function revalidateAll() {
  safeRevalidate(["/adjust", "/dashboard", "/products", "/aging", "/locations", "/map"]);
}

export async function confirmAdjustAction(input: ConfirmAdjustInput) {
  await requireWrite();
  const docDate = new Date(input.docDate);
  const docNo = await nextDocNumber("ADJ", docDate);

  await db.$transaction(async (tx) => {
    const adj = await tx.adjustment.create({
      data: { docNo, reason: input.reason, docDate, note: input.note?.trim() || null },
    });
    for (const line of input.lines) {
      const lot = await tx.lot.findUnique({ where: { id: line.lotId } });
      if (!lot) continue;
      await tx.adjustmentLine.create({
        data: {
          adjustmentId: adj.id,
          lotId: lot.id,
          sysQty: lot.qty,
          countedQty: line.countedQty,
        },
      });
      await tx.lot.update({ where: { id: lot.id }, data: { qty: line.countedQty } });
    }
  });

  revalidateAll();
  return { docNo };
}
