"use server";

import { safeRevalidate } from "./revalidate";
import { db } from "@/lib/db";
import { requireWrite } from "@/lib/authz";

export type MetaEditableKind = "receipt" | "issue";

/** Add / update the SAP Material Document number and Remark on a receipt or
 *  issue after the fact — the SAP number is often only known later. */
export async function updateDocMetaAction(
  kind: MetaEditableKind,
  id: string,
  meta: { materialDoc?: string | null; remark?: string | null }
): Promise<{ error?: string }> {
  try {
    await requireWrite();
    const data = {
      materialDoc: meta.materialDoc?.trim() || null,
      remark: meta.remark?.trim() || null,
    };
    if (kind === "receipt") await db.receipt.update({ where: { id }, data });
    else await db.issue.update({ where: { id }, data });

    safeRevalidate(["/receive", "/issue", "/reports", "/search", "/dashboard"]);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }
}
