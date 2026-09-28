"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";

/**
 * Merge duplicate stock records that describe the same physical pile — same
 * product + lot + location + status — into one record: sum their on-hand onto
 * the earliest-received record and drain the rest to 0. Lossless (total qty is
 * preserved) and idempotent. Records are drained, not deleted, so historical
 * document lines that reference them keep their foreign key; a 0-qty record is
 * hidden from every stock view and picker (they all filter qty > 0).
 *
 * Runs on a bin-to-bin move so moving a lot onto a bin that already holds it
 * merges instead of leaving two records — and clears any pre-existing duplicates
 * at the same time. Takes the active transaction client.
 */
async function consolidateDuplicateLots(tx: Prisma.TransactionClient) {
  const lots = await tx.lot.findMany({
    where: { qty: { gt: 0 } },
    orderBy: { recvDate: "asc" }, // earliest received is the merge target (FEFO-friendly)
  });
  const groups = new Map<string, typeof lots>();
  for (const l of lots) {
    const key = `${l.productCode}||${l.lotNo}||${l.locationCode}||${l.status}`;
    const g = groups.get(key);
    if (g) g.push(l);
    else groups.set(key, [l]);
  }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const [target, ...rest] = g;
    const extra = rest.reduce((s, r) => s + r.qty, 0);
    if (extra <= 0) continue;
    await tx.lot.update({ where: { id: target.id }, data: { qty: { increment: extra } } });
    await tx.lot.updateMany({ where: { id: { in: rest.map((r) => r.id) } }, data: { qty: 0 } });
  }
}

/** Relocate a whole lot to another bin (quick bin-to-bin move from the map).
 *  Moving onto a bin that already holds the same lot merges them into one
 *  record (and tidies any other duplicate piles) rather than stacking a second. */
export async function moveLotAction(
  lotId: string,
  toLocationCode: string
): Promise<{ error?: string }> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const to = toLocationCode.trim();
  if (!to) return { error: "ระบุช่องปลายทาง" };
  const [loc, lot] = await Promise.all([
    db.location.findUnique({ where: { code: to } }),
    db.lot.findUnique({ where: { id: lotId } }),
  ]);
  if (!loc) return { error: `ไม่พบช่อง ${to}` };
  if (!lot) return { error: "ไม่พบลอต" };
  if (lot.locationCode === to) return { error: "ลอตนี้อยู่ช่องนี้อยู่แล้ว" };

  await db.$transaction(async (tx) => {
    await tx.lot.update({ where: { id: lotId }, data: { locationCode: to } });
    // Relocating onto the same lot creates a duplicate record — merge it (and any
    // other same-lot/same-bin duplicates) so one bin holds one record per lot.
    await consolidateDuplicateLots(tx);
  });
  revalidatePath("/map");
  revalidatePath("/locations");
  revalidatePath("/products");
  return {};
}

/** Save the map layout order for a zone. `orderedCodes` is the full list of the
 *  zone's location codes in the desired left-to-right order; each gets mapOrder
 *  = its index. This only changes how the map is drawn — it never moves any
 *  stock. */
export async function setMapOrderAction(orderedCodes: string[]): Promise<{ error?: string }> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const codes = orderedCodes.map((c) => c.trim()).filter(Boolean);
  if (codes.length === 0) return { error: "ไม่มีช่องให้จัดเรียง" };
  await db.$transaction(
    codes.map((code, i) => db.location.update({ where: { code }, data: { mapOrder: i } }))
  );
  revalidatePath("/map");
  revalidatePath("/locations");
  return {};
}

/** Save the custom pallet arrangement inside one bin (drag pallets to their
 *  real spot/level). Purely a display preference — never moves stock. */
export async function setBinSlotMapAction(
  code: string,
  slots: { s: number; l: number; lot: string }[]
): Promise<{ error?: string }> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const c = code.trim();
  if (!c) return { error: "ไม่พบช่อง" };
  const clean = (Array.isArray(slots) ? slots : [])
    .filter(
      (s) =>
        s &&
        Number.isFinite(s.s) &&
        Number.isFinite(s.l) &&
        typeof s.lot === "string" &&
        s.lot.length > 0
    )
    .map((s) => ({ s: Math.trunc(s.s), l: Math.trunc(s.l), lot: s.lot }));
  await db.location.update({ where: { code: c }, data: { slotMap: clean } });
  revalidatePath("/map");
  return {};
}

/** Replace the list of non-stock items (Reuse material, empty pallets…) placed
 *  in a bin. Display only — these are not tracked inventory. */
export async function setBinExtrasAction(
  code: string,
  items: { id: string; label: string; pallets: number }[]
): Promise<{ error?: string }> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const c = code.trim();
  if (!c) return { error: "ไม่พบช่อง" };
  const clean = (Array.isArray(items) ? items : [])
    .map((it) => ({
      id: String(it?.id ?? "").trim(),
      label: String(it?.label ?? "").trim(),
      pallets: Math.max(1, Math.trunc(Number(it?.pallets))),
    }))
    .filter((it) => it.id && it.label && Number.isFinite(it.pallets));
  await db.location.update({ where: { code: c }, data: { extraItems: clean } });
  revalidatePath("/map");
  revalidatePath("/locations");
  revalidatePath("/dashboard");
  return {};
}

/** Set the actual pallet-stack height used in a bin (may be lower than the
 *  product's max). Pass null to go back to "stack to the max". Display only. */
export async function setBinStackAction(
  code: string,
  stackUsed: number | null
): Promise<{ error?: string }> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const c = code.trim();
  if (!c) return { error: "ไม่พบช่อง" };
  const val =
    stackUsed == null || !Number.isFinite(stackUsed)
      ? null
      : Math.max(1, Math.min(20, Math.trunc(stackUsed)));
  await db.location.update({ where: { code: c }, data: { stackUsed: val } });
  revalidatePath("/map");
  revalidatePath("/locations");
  revalidatePath("/dashboard");
  return {};
}

/** Swap the contents of two bins (all lots in A ↔ all lots in B). */
export async function swapLocationsAction(
  codeA: string,
  codeB: string
): Promise<{ error?: string }> {
  try {
    await requireWrite();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const a = codeA.trim();
  const b = codeB.trim();
  if (!a || !b || a === b) return { error: "เลือกช่องปลายทางที่ต่างกัน" };
  const [locA, locB] = await Promise.all([
    db.location.findUnique({ where: { code: a } }),
    db.location.findUnique({ where: { code: b } }),
  ]);
  if (!locA || !locB) return { error: "ไม่พบช่องที่เลือก" };

  // Reassign by lot id (locationCode is a FK, so a sentinel value can't be used).
  const [lotsA, lotsB] = await Promise.all([
    db.lot.findMany({ where: { locationCode: a }, select: { id: true } }),
    db.lot.findMany({ where: { locationCode: b }, select: { id: true } }),
  ]);
  const idsA = lotsA.map((l) => l.id);
  const idsB = lotsB.map((l) => l.id);
  await db.$transaction([
    db.lot.updateMany({ where: { id: { in: idsA } }, data: { locationCode: b } }),
    db.lot.updateMany({ where: { id: { in: idsB } }, data: { locationCode: a } }),
  ]);
  revalidatePath("/map");
  revalidatePath("/locations");
  revalidatePath("/products");
  return {};
}
