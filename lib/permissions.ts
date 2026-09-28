// Access levels — safe to import from both client and server code.
export type Permission = "admin" | "staff" | "viewer";

/** Normalise a stored/session permission string. Unknown/missing → "admin" so a
 *  stale session (from before this field existed) is never locked out; real
 *  accounts always carry an explicit value. */
export function normPerm(p?: string | null): Permission {
  return p === "viewer" || p === "staff" || p === "admin" ? p : "admin";
}

/** Can this account create/edit/confirm documents? (viewers cannot) */
export function canWrite(p?: string | null): boolean {
  return normPerm(p) !== "viewer";
}

/** Can this account manage users / settings / master data? (admins only) */
export function canAdmin(p?: string | null): boolean {
  return normPerm(p) === "admin";
}

export const PERMISSION_LABEL: Record<Permission, string> = {
  admin: "Admin — จัดการทุกอย่าง",
  staff: "Staff — คีย์เอกสารได้",
  viewer: "Viewer — ดูอย่างเดียว",
};

export const PERMISSION_OPTIONS: Permission[] = ["admin", "staff", "viewer"];
