import "server-only";
import { db } from "@/lib/db";
import { beYear } from "./date";

export type DocPrefix = "PO" | "SO" | "RC" | "ISS" | "ADJ" | "TRF" | "CNT" | "LOT" | "RT";

/** Real, transaction-safe {PREFIX}-{BEyear}-{seq:04d} auto-numbering per doc type. */
export async function nextDocNumber(
  prefix: DocPrefix,
  date: Date = new Date()
): Promise<string> {
  const year = beYear(date);
  const seq = await db.$transaction(async (tx) => {
    const row = await tx.docSequence.upsert({
      where: { prefix_beYear: { prefix, beYear: year } },
      update: { lastSeq: { increment: 1 } },
      create: { prefix, beYear: year, lastSeq: 1 },
    });
    return row.lastSeq;
  });
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/** Peek at the number that WOULD be issued next, without consuming it (for display before confirm). */
export async function peekNextDocNumber(
  prefix: DocPrefix,
  date: Date = new Date()
): Promise<string> {
  const year = beYear(date);
  const row = await db.docSequence.findUnique({
    where: { prefix_beYear: { prefix, beYear: year } },
  });
  const seq = (row?.lastSeq ?? 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
