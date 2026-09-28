"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";
import { eligibleLots, fefoLotFor } from "@/lib/calc/fefo";

export type IssueLineInput = {
  productCode: string;
  selectedLotId: string;
  qty: number;
};

export type ConfirmIssueInput = {
  issueType?: "INTERNAL" | "EXTERNAL";
  issueTo: string;
  customerId?: string | null;
  shipToId?: string | null;
  materialDoc?: string | null;
  remark?: string | null;
  docDate: string;
  lines: IssueLineInput[];
};

function revalidateAll() {
  safeRevalidate(["/issue", "/dashboard", "/products", "/aging", "/locations", "/map"]);
}

export async function confirmIssueAction(
  input: ConfirmIssueInput
): Promise<{ docNo?: string; error?: string }> {
  const docDate = new Date(input.docDate);

  try {
    await requireWrite();
    const issueType = input.issueType ?? "INTERNAL";
    if (issueType === "EXTERNAL" && !input.customerId) {
      return { error: "การจ่ายภายนอกต้องเลือกลูกค้า (external issue needs a customer)" };
    }
    const docNo = await nextDocNumber("ISS", docDate);

    // A customer/ship-to only applies to an EXTERNAL (sold-out) issue.
    // Resolve them so we can snapshot the name+address onto the document (kept
    // correct even if the master record changes later).
    const customer =
      issueType === "EXTERNAL" && input.customerId
        ? await db.customer.findUnique({ where: { id: input.customerId } })
        : null;
    const shipTo = input.shipToId
      ? await db.shipToAddress.findUnique({ where: { id: input.shipToId } })
      : null;
    // Only trust a ship-to that actually belongs to the chosen customer.
    const shipToValid = shipTo && customer && shipTo.customerId === customer.id ? shipTo : null;

    await db.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          docNo,
          issueType,
          issueTo: input.issueTo,
          customerId: customer?.id ?? null,
          shipToId: shipToValid?.id ?? null,
          shipToName: customer?.name ?? null,
          shipToAddress: shipToValid?.address ?? null,
          materialDoc: input.materialDoc?.trim() || null,
          remark: input.remark?.trim() || null,
          docDate,
          shippedDate: docDate,
        },
      });

      for (const line of input.lines) {
        if (line.qty <= 0) continue;

        const sel = await tx.lot.findUnique({ where: { id: line.selectedLotId } });
        if (!sel) {
          throw new Error(`Not enough stock for ${line.productCode} (สต็อกไม่พอ)`);
        }

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

        // The dropdown shows one option per lot+location, but that can be backed
        // by several stock records. Draw across every record of that same lot in
        // that same location, FEFO-first, until the requested qty is met.
        const siblings = allLots.filter(
          (l) => l.lotNo === sel.lotNo && l.locationCode === sel.locationCode
        );
        const ordered = eligibleLots(
          siblings.map((l) => ({
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
        if (avail < line.qty) {
          throw new Error(
            `Not enough stock for ${line.productCode} (สต็อกไม่พอ — มี ${avail.toLocaleString()}, ขอจ่าย ${line.qty.toLocaleString()})`
          );
        }

        let remaining = line.qty;
        for (const s of ordered) {
          if (remaining <= 0) break;
          const take = Math.min(s.qty, remaining);
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
          remaining -= take;
        }
      }
    });

    revalidateAll();
    return { docNo };
  } catch (e) {
    // Return the message so it survives to the client — Next hides thrown
    // server-action error messages in production.
    return { error: e instanceof Error ? e.message : "Failed to confirm issue." };
  }
}
