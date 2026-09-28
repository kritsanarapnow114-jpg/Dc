"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";
import { isBadDateInput } from "@/lib/calc/date";

export type ReceiveLineInput = {
  productCode: string;
  orderedQty: number | null;
  recvQty: number;
  lotNo: string;
  locationCode: string;
  mfgDate: string | null;
  expDate: string | null;
};

export type ConfirmReceiptInput = {
  mode: "PO";
  poId: string | null;
  invoiceNo: string | null;
  materialDoc?: string | null;
  remark?: string | null;
  docDate: string;
  lines: ReceiveLineInput[];
};

function revalidateAll() {
  safeRevalidate(["/receive", "/dashboard", "/products", "/po", "/aging", "/locations", "/map"]);
}

export async function confirmReceiptAction(
  input: ConfirmReceiptInput
): Promise<{ docNo?: string; error?: string }> {
  const docDate = new Date(input.docDate);

  try {
    await requireWrite();

    // Reject fat-fingered / out-of-range dates up front with a clear message,
    // instead of letting an un-serializable DateTime blow up mid-transaction.
    if (isBadDateInput(input.docDate)) {
      return { error: "วันที่เอกสารไม่ถูกต้อง — ตรวจสอบปีอีกครั้ง (invalid document date)" };
    }
    const badDateLine = input.lines.find(
      (l) => isBadDateInput(l.mfgDate) || isBadDateInput(l.expDate)
    );
    if (badDateLine) {
      return {
        error: `วันผลิต/วันหมดอายุไม่ถูกต้อง (ปีเกินช่วง) — ตรวจสอบสินค้า ${badDateLine.productCode} (invalid mfg/expiry date)`,
      };
    }

    const docNo = await nextDocNumber("RC", docDate);

    await db.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: {
        docNo,
        mode: input.mode,
        poId: input.poId,
        invoiceNo: input.invoiceNo,
        materialDoc: input.materialDoc?.trim() || null,
        remark: input.remark?.trim() || null,
        docDate,
      },
    });

    for (const line of input.lines) {
      if (line.recvQty <= 0) continue;

      const lotNo = line.lotNo || "-";
      let lot = await tx.lot.findFirst({
        where: { productCode: line.productCode, locationCode: line.locationCode, lotNo },
      });
      if (lot) {
        lot = await tx.lot.update({
          where: { id: lot.id },
          data: {
            // Atomic increment (qty = qty + n at the DB) so two receipts landing
            // in the same lot concurrently can't overwrite each other's total.
            qty: { increment: line.recvQty },
            mfgDate: line.mfgDate ? new Date(line.mfgDate) : lot.mfgDate,
            expDate: line.expDate ? new Date(line.expDate) : lot.expDate,
          },
        });
      } else {
        lot = await tx.lot.create({
          data: {
            productCode: line.productCode,
            locationCode: line.locationCode,
            lotNo,
            qty: line.recvQty,
            status: "OK",
            recvDate: docDate,
            mfgDate: line.mfgDate ? new Date(line.mfgDate) : null,
            expDate: line.expDate ? new Date(line.expDate) : null,
          },
        });
      }
      const lotId = lot.id;

      await tx.receiptLine.create({
        data: {
          receiptId: receipt.id,
          productCode: line.productCode,
          orderedQty: line.orderedQty,
          recvQty: line.recvQty,
          lotNo,
          locationCode: line.locationCode,
          mfgDate: line.mfgDate ? new Date(line.mfgDate) : null,
          expDate: line.expDate ? new Date(line.expDate) : null,
          lotId,
        },
      });

      if (input.mode === "PO" && input.poId) {
        const poLine = await tx.purchaseOrderLine.findFirst({
          where: { poId: input.poId, productCode: line.productCode },
        });
        if (poLine) {
          await tx.purchaseOrderLine.update({
            where: { id: poLine.id },
            data: { received: { increment: line.recvQty } }, // atomic — see lot note above
          });
        }
      }
    }

    if (input.mode === "PO" && input.poId) {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: input.poId },
        include: { lines: true },
      });
      if (po) {
        const allDone = po.lines.every((l) => l.received >= l.ordered);
        const anyReceived = po.lines.some((l) => l.received > 0);
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: allDone ? "COMPLETE" : anyReceived ? "PENDING" : "OPEN" },
        });
      }
    }

    });

    revalidateAll();
    return { docNo };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to confirm receipt." };
  }
}

export type ReceiptLineEdit = {
  productCode: string;
  recvQty: number;
  lotNo: string;
  locationCode: string;
  mfgDate: string | null;
  expDate: string | null;
};

/**
 * Correct a single line on a posted (non-reversed) receipt — product, lot,
 * location, qty, mfg/expiry — moving the stock booking to match.
 *
 * If the line already put stock into a lot, that contribution is pulled from the
 * source lot and re-added to the destination lot (merging into an existing one)
 * — refused if the source stock has since been moved or issued. A line with no
 * stock booked just has its fields updated.
 * For PO receipts the PO received counter is kept in step.
 */
export async function updateReceiptLineAction(
  lineId: string,
  patch: ReceiptLineEdit
): Promise<{ error?: string }> {
  await requireWrite();
  const productCode = patch.productCode.trim();
  const locationCode = patch.locationCode.trim();
  const lotNo = patch.lotNo.trim() || "-";
  const recvQty = Number(patch.recvQty);
  if (!productCode) return { error: "เลือกสินค้า (select a product)" };
  if (!locationCode) return { error: "เลือกที่เก็บ (select a location)" };
  if (!Number.isFinite(recvQty) || recvQty <= 0) return { error: "จำนวนต้องมากกว่า 0 (qty must be > 0)" };
  if (isBadDateInput(patch.mfgDate) || isBadDateInput(patch.expDate)) return { error: "รูปแบบวันที่ไม่ถูกต้อง (bad date)" };

  const result = await db.$transaction(async (tx) => {
    const line = await tx.receiptLine.findUnique({ where: { id: lineId }, include: { receipt: true } });
    if (!line) return { error: "ไม่พบรายการ (line not found)" };
    if (line.receipt.reversedAt) return { error: "เอกสารถูกถอยแล้ว แก้ไขไม่ได้ (document reversed)" };

    const [product, loc] = await Promise.all([
      tx.product.findUnique({ where: { code: productCode } }),
      tx.location.findUnique({ where: { code: locationCode } }),
    ]);
    if (!product) return { error: `ไม่พบสินค้า ${productCode} (product not found)` };
    if (!loc) return { error: `ไม่พบที่เก็บ ${locationCode} (location not found)` };

    const mfg = patch.mfgDate ? new Date(patch.mfgDate) : null;
    const exp = patch.expDate ? new Date(patch.expDate) : null;

    if (line.lotId) {
      // Pull this line's stock back from its source lot (fall back to matching by
      // product+lot+location if the stored lotId is stale after a merge).
      const srcLot =
        (await tx.lot.findUnique({ where: { id: line.lotId } })) ??
        (await tx.lot.findFirst({
          where: { productCode: line.productCode, lotNo: line.lotNo, locationCode: line.locationCode },
        }));
      if (!srcLot || srcLot.qty < line.recvQty) {
        return {
          error: "แก้ไขไม่ได้ — สต็อกของบรรทัดนี้ถูกย้าย/เบิกไปแล้ว (stock already moved or issued)",
        };
      }
      await tx.lot.update({ where: { id: srcLot.id }, data: { qty: { decrement: line.recvQty } } });

      // Re-add to the destination lot, merging into an existing same-lot record.
      const dest = await tx.lot.findFirst({ where: { productCode, lotNo, locationCode } });
      let destId: string;
      if (dest) {
        await tx.lot.update({
          where: { id: dest.id },
          data: { qty: { increment: recvQty }, mfgDate: mfg ?? dest.mfgDate, expDate: exp ?? dest.expDate },
        });
        destId = dest.id;
      } else {
        const created = await tx.lot.create({
          data: { productCode, locationCode, lotNo, qty: recvQty, status: srcLot.status, recvDate: srcLot.recvDate, mfgDate: mfg, expDate: exp },
        });
        destId = created.id;
      }
      await tx.receiptLine.update({
        where: { id: lineId },
        data: { productCode, recvQty, lotNo, locationCode, mfgDate: mfg, expDate: exp, lotId: destId },
      });
    } else {
      // No stock booked on this line — edit fields.
      await tx.receiptLine.update({
        where: { id: lineId },
        data: { productCode, recvQty, lotNo, locationCode, mfgDate: mfg, expDate: exp },
      });
    }

    // Keep the PO received counter in step for PO receipts.
    if (line.receipt.mode === "PO" && line.receipt.poId) {
      const poId = line.receipt.poId;
      if (productCode !== line.productCode) {
        const oldPoLine = await tx.purchaseOrderLine.findFirst({ where: { poId, productCode: line.productCode } });
        if (oldPoLine) await tx.purchaseOrderLine.update({ where: { id: oldPoLine.id }, data: { received: { decrement: line.recvQty } } });
        const newPoLine = await tx.purchaseOrderLine.findFirst({ where: { poId, productCode } });
        if (newPoLine) await tx.purchaseOrderLine.update({ where: { id: newPoLine.id }, data: { received: { increment: recvQty } } });
      } else if (recvQty !== line.recvQty) {
        const poLine = await tx.purchaseOrderLine.findFirst({ where: { poId, productCode } });
        if (poLine) await tx.purchaseOrderLine.update({ where: { id: poLine.id }, data: { received: { increment: recvQty - line.recvQty } } });
      }
      const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true } });
      if (po) {
        const allDone = po.lines.every((l) => l.received >= l.ordered);
        const anyReceived = po.lines.some((l) => l.received > 0);
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: allDone ? "COMPLETE" : anyReceived ? "PENDING" : "OPEN" },
        });
      }
    }

    return {};
  });

  if (!result.error) revalidateAll();
  return result;
}
