"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";

export type TransferLineInput = { lotId: string; toLocationCode: string; qty: number };
export type ConfirmTransferInput = {
  operator: string;
  docDate: string;
  lines: TransferLineInput[];
};

function revalidateAll() {
  safeRevalidate(["/transfer", "/dashboard", "/products", "/locations", "/aging", "/map"]);
}

export async function confirmTransferAction(input: ConfirmTransferInput) {
  await requireWrite();
  const docDate = new Date(input.docDate);
  const docNo = await nextDocNumber("TRF", docDate);

  await db.$transaction(async (tx) => {
    const transfer = await tx.transfer.create({
      data: { docNo, operator: input.operator, docDate },
    });

    for (const line of input.lines) {
      const head = await tx.lot.findUnique({ where: { id: line.lotId } });
      if (!head || line.qty <= 0) continue;
      if (head.locationCode === line.toLocationCode) continue;

      // The picker shows one option per physical pile, but that pile can be
      // several stock records (same product + lot + location + status). Draw the
      // requested qty across every record of the group, FEFO (earliest received
      // first), so moving the merged line moves the whole pile in one go.
      const group = await tx.lot.findMany({
        where: {
          productCode: head.productCode,
          lotNo: head.lotNo,
          locationCode: head.locationCode,
          status: head.status,
          qty: { gt: 0 },
        },
        orderBy: { recvDate: "asc" },
      });
      const available = group.reduce((s, l) => s + l.qty, 0);
      const moveQty = Math.min(line.qty, available);
      if (moveQty <= 0) continue;

      await tx.transferLine.create({
        data: {
          transferId: transfer.id,
          lotId: head.id,
          fromLocationCode: head.locationCode,
          toLocationCode: line.toLocationCode,
          qty: moveQty,
        },
      });

      let remaining = moveQty;
      for (const l of group) {
        if (remaining <= 0) break;
        const take = Math.min(l.qty, remaining);
        await tx.lot.update({ where: { id: l.id }, data: { qty: { decrement: take } } });
        remaining -= take;
      }

      // Add to the destination, merging into an existing record of the same lot
      // there so one bin holds one record per lot.
      const existing = await tx.lot.findFirst({
        where: {
          productCode: head.productCode,
          locationCode: line.toLocationCode,
          lotNo: head.lotNo,
        },
      });
      if (existing) {
        await tx.lot.update({ where: { id: existing.id }, data: { qty: { increment: moveQty } } });
      } else {
        await tx.lot.create({
          data: {
            productCode: head.productCode,
            locationCode: line.toLocationCode,
            lotNo: head.lotNo,
            qty: moveQty,
            status: head.status,
            recvDate: head.recvDate,
            mfgDate: head.mfgDate,
            expDate: head.expDate,
          },
        });
      }
    }
  });

  revalidateAll();
  return { docNo };
}
