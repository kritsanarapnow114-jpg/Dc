import { revalidatePath } from "next/cache";

/** Best-effort cache invalidation. The calling mutation has already committed,
 *  so a revalidation/re-render hiccup must never bubble up and fail the action
 *  (which would make the user think it failed and re-submit — a double post). */
export function safeRevalidate(paths: string[]) {
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      // ignore — revalidation is not critical to the committed mutation
    }
  }
}
