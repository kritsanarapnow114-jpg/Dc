import "server-only";
import { getSession } from "./session";
import { canWrite, canAdmin } from "./permissions";

/** Throw if the current session is a read-only (viewer) account. Call at the
 *  top of any server action that creates/edits/confirms data. */
export async function requireWrite() {
  const s = await getSession();
  if (!canWrite(s?.permission)) {
    throw new Error(
      "บัญชีนี้ดูข้อมูลได้อย่างเดียว ไม่มีสิทธิ์บันทึก (this account is read-only)"
    );
  }
}

/** Throw unless the current session is an admin (user/settings/master data). */
export async function requireAdmin() {
  const s = await getSession();
  if (!canAdmin(s?.permission)) {
    throw new Error("ต้องเป็นผู้ดูแลระบบ (admin) เท่านั้น (admins only)");
  }
}
