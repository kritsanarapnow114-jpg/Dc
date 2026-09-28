"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";

/** Upsert one or more app settings. An empty-string value deletes the key so
 *  it reverts to its built-in default. */
export async function saveAppSettingsAction(entries: Record<string, string>) {
  await requireAdmin();
  for (const [key, raw] of Object.entries(entries)) {
    const value = raw.trim();
    if (value === "") {
      await db.appSetting.deleteMany({ where: { key } });
    } else {
      await db.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
  // Subtitles show in the shared header on every page; refresh broadly.
  revalidatePath("/", "layout");
  return { ok: true };
}
