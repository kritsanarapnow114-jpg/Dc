"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";
import { nextDocNumber } from "@/lib/calc/docNumber";
import { productLabel } from "@/lib/calc/productName";
import { getLotQtyAsOf } from "@/lib/views/countAsOf";
import { Zone, Prisma } from "@prisma/client";

export type CountLineInput = { lotId: string; countedQty: number; sysQty?: number };
export type OffSystemLineInput = {
  productCode: string;
  lotNo: string;
  locationCode: string;
  countedQty: number;
};
export type ConfirmCountInput = {
  pullZone: string;
  docDate: string;
  lines: CountLineInput[];
  offSystemLines?: OffSystemLineInput[];
};

const VALID_ZONES: Zone[] = ["A", "B", "C", "D", "E"];

/** `zoneCode` is a zone letter (A–E) or "ALL"/"" for every zone. (Older callers
 *  passed the label string; anything that isn't a valid zone letter falls back
 *  to "all zones", so nothing silently returns empty.) */
export async function getLotsByZoneAction(zoneCode: string, asOfDate?: string) {
  return getCountLotsAction("zone", zoneCode, asOfDate);
}

/** Pull lots for a count filtered by one of three scopes: a whole Zone (letter
 *  A–E, or ALL), a single Location (bin), or a single Lot number (across bins). */
export async function getCountLotsAction(
  mode: "zone" | "location" | "lot",
  value: string,
  asOfDate?: string
) {
  let scope: Prisma.LotWhereInput = {};
  if (mode === "zone") {
    const code = (value || "").trim().toUpperCase();
    const zone = (VALID_ZONES as string[]).includes(code) ? (code as Zone) : null;
    scope = zone ? { location: { zone } } : {};
  } else if (mode === "location") {
    // "" / "ALL" = every location; otherwise the one chosen bin.
    scope = !value || value === "ALL" ? {} : { locationCode: value };
  } else {
    scope = !value || value === "ALL" ? {} : { lotNo: value };
  }

  // With an as-of date we must consider every lot in scope (some empty now may
  // have had stock then; some with stock now may not have existed yet), so we
  // don't pre-filter on current qty — we filter on the as-of quantity instead.
  const asOfMap = asOfDate ? await getLotQtyAsOf(asOfDate) : null;
  const lots = await db.lot.findMany({
    where: asOfMap ? scope : { qty: { gt: 0 }, ...scope },
    include: { product: true },
    orderBy: [{ locationCode: "asc" }, { productCode: "asc" }],
  });
  const rows = lots
    .map((l) => ({
      id: l.id,
      productCode: l.productCode,
      name: productLabel(l.product.nameEn, l.product.nameTh),
      lotNo: l.lotNo,
      locationCode: l.locationCode,
      sysQty: asOfMap ? Math.round((asOfMap.get(l.id) ?? 0) * 1000) / 1000 : l.qty,
    }))
    .filter((r) => r.sysQty > 0);

  // "By Location" pull: one row per lot exactly as it sits in the bin — nothing
  // is merged. Different products and different lots each get their own row (so a
  // bin with two lots of the same product shows two rows), and System is that
  // single lot's own quantity. Rows are already ordered by bin then product.
  if (mode === "location") {
    return rows;
  }

  // "By Zone" / "By Lot" pull: sum by LOT (across every bin it sits in) so one
  // lot is one line to count — not split per bin. The Location column then lists
  // all the bins that lot is in. The count only records numbers (it never moves
  // stock), so recording against one representative lot id with the merged sysQty
  // keeps the accuracy figures correct.
  const merged = new Map<string, (typeof rows)[number] & { bins: Set<string> }>();
  for (const r of rows) {
    const key = `${r.productCode}||${r.lotNo}`;
    const ex = merged.get(key);
    if (ex) {
      ex.sysQty = Math.round((ex.sysQty + r.sysQty) * 1000) / 1000;
      ex.bins.add(r.locationCode);
    } else {
      merged.set(key, { ...r, bins: new Set([r.locationCode]) });
    }
  }
  return [...merged.values()].map(({ bins, ...r }) => ({
    ...r,
    locationCode: [...bins].sort().join(", "),
  }));
}

export async function confirmCountAction(input: ConfirmCountInput) {
  await requireWrite();
  const docDate = new Date(input.docDate);
  const docNo = await nextDocNumber("CNT", docDate);

  await db.$transaction(async (tx) => {
    const count = await tx.stockCount.create({
      data: { docNo, pullZone: input.pullZone, docDate },
    });
    for (const line of input.lines) {
      const lot = await tx.lot.findUnique({ where: { id: line.lotId } });
      if (!lot) continue;
      await tx.stockCountLine.create({
        data: {
          stockCountId: count.id,
          lotId: lot.id,
          // Use the system qty the counter actually saw. For a back-dated count
          // that's the balance as of the chosen date; for a normal count it's the
          // current qty. Falling back to current keeps older callers working.
          sysQty: line.sysQty ?? lot.qty,
          countedQty: line.countedQty,
        },
      });
    }

    // Off-system finds: physical stock with no existing lot record. Create the
    // lot so it enters inventory (system qty was 0), and log it in the count.
    for (const off of input.offSystemLines ?? []) {
      if (off.countedQty <= 0) continue;
      const location = await tx.location.findUnique({ where: { code: off.locationCode } });
      const product = await tx.product.findUnique({ where: { code: off.productCode } });
      if (!location || !product) continue;

      const lotNo = off.lotNo.trim() || "-";
      // Merge into an existing matching lot if one already exists at that spot.
      let lot = await tx.lot.findFirst({
        where: { productCode: off.productCode, locationCode: off.locationCode, lotNo },
      });
      const sysQty = lot?.qty ?? 0;
      if (lot) {
        lot = await tx.lot.update({
          where: { id: lot.id },
          data: { qty: { increment: off.countedQty } },
        });
      } else {
        lot = await tx.lot.create({
          data: {
            productCode: off.productCode,
            locationCode: off.locationCode,
            lotNo,
            qty: off.countedQty,
            status: "OK",
            recvDate: docDate,
          },
        });
      }
      await tx.stockCountLine.create({
        data: {
          stockCountId: count.id,
          lotId: lot.id,
          sysQty,
          countedQty: sysQty + off.countedQty,
          addedQty: off.countedQty, // stock brought in — undone if the count is reversed
        },
      });
    }
  });

  safeRevalidate(["/count", "/dashboard", "/products", "/aging", "/locations", "/map"]);
  return { docNo };
}
