"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";
import { isBadDateInput } from "@/lib/calc/date";

export type ReturnDispositionInput = "RESTOCK" | "HOLD" | "SCRAP";

export type ReturnLineInput = {
  productCode: string;
  lotNo: string;
  qty: number;
  disposition: ReturnDispositionInput;
  /** Required for RESTOCK / HOLD (where the goods are put); ignored for SCRAP. */
  locationCode: string | null;
  mfgDate: string | null;
  expDate: string | null;
};

export type ConfirmReturnInput = {
  customerId: string | null;
  /** The original shipment (goods issue) being returned, if known. */
  issueId: string | null;
  reason: string;
  remark?: string | null;
  docDate: string;
  lines: ReturnLineInput[];
};

function revalidateAll() {
  safeRevalidate(["/returns", "/dashboard", "/products", "/aging", "/locations", "/map", "/reports", "/search"]);
}

/**
 * Receive goods back from a customer. Each line gets a QC disposition:
 *  - RESTOCK → booked into a lot with status OK (sellable, FEFO can pick it)
 *  - HOLD    → booked into a lot with status QC (kept, never picked by FEFO)
 *  - SCRAP   → recorded on the document only; no stock is created
 * A RESTOCK/HOLD line merges into an existing lot record of the same product +
 * lot + location + status, otherwise a new lot record is created.
 */
export async function confirmReturnAction(
  input: ConfirmReturnInput
): Promise<{ docNo?: string; error?: string }> {
  try {
    await requireWrite();

    if (isBadDateInput(input.docDate)) {
      return { error: "วันที่เอกสารไม่ถูกต้อง (invalid document date)" };
    }
    if (!input.reason.trim()) {
      return { error: "กรุณาระบุเหตุผลการคืน (return reason is required)" };
    }
    const lines = input.lines.filter((l) => l.qty > 0);
    if (lines.length === 0) {
      return { error: "ยังไม่มีรายการคืน (add at least one line with qty > 0)" };
    }
    for (const l of lines) {
      if (!Number.isFinite(l.qty)) return { error: `จำนวนไม่ถูกต้อง (${l.productCode})` };
      if (l.disposition !== "SCRAP" && !l.locationCode) {
        return { error: `เลือก Location สำหรับ ${l.productCode} (restock/hold needs a location)` };
      }
      if (isBadDateInput(l.mfgDate) || isBadDateInput(l.expDate)) {
        return { error: `วันผลิต/วันหมดอายุไม่ถูกต้อง — ${l.productCode} (invalid mfg/expiry date)` };
      }
    }

    const docDate = new Date(input.docDate);

    // Only keep an issue link that really exists (and matches the customer when given).
    const issue = input.issueId
      ? await db.issue.findUnique({ where: { id: input.issueId } })
      : null;
    const customerId = input.customerId || issue?.customerId || null;

    const docNo = await nextDocNumber("RT", docDate);

    await db.$transaction(async (tx) => {
      const ret = await tx.customerReturn.create({
        data: {
          docNo,
          customerId,
          issueId: issue?.id ?? null,
          reason: input.reason.trim(),
          remark: input.remark?.trim() || null,
          docDate,
        },
      });

      for (const line of lines) {
        const lotNo = line.lotNo.trim() || "-";
        const mfg = line.mfgDate ? new Date(line.mfgDate) : null;
        const exp = line.expDate ? new Date(line.expDate) : null;
        let lotId: string | null = null;

        if (line.disposition !== "SCRAP" && line.locationCode) {
          const status = line.disposition === "HOLD" ? "QC" : "OK";
          const existing = await tx.lot.findFirst({
            where: { productCode: line.productCode, locationCode: line.locationCode, lotNo, status },
          });
          if (existing) {
            const upd = await tx.lot.update({
              where: { id: existing.id },
              data: {
                qty: { increment: line.qty },
                mfgDate: existing.mfgDate ?? mfg,
                expDate: existing.expDate ?? exp,
              },
            });
            lotId = upd.id;
          } else {
            const created = await tx.lot.create({
              data: {
                productCode: line.productCode,
                locationCode: line.locationCode,
                lotNo,
                qty: line.qty,
                status,
                recvDate: docDate,
                mfgDate: mfg,
                expDate: exp,
              },
            });
            lotId = created.id;
          }
        }

        await tx.customerReturnLine.create({
          data: {
            returnId: ret.id,
            productCode: line.productCode,
            lotNo,
            locationCode: line.disposition === "SCRAP" ? null : line.locationCode,
            qty: line.qty,
            mfgDate: mfg,
            expDate: exp,
            disposition: line.disposition,
            lotId,
          },
        });
      }
    });

    revalidateAll();
    return { docNo };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "บันทึกรับคืนไม่สำเร็จ (failed to save return)" };
  }
}
