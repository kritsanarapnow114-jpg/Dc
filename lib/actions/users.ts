"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { normPerm } from "@/lib/permissions";

export type FormState = { error?: string };

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function createUserAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const loginId = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "Warehouse Staff").trim();
  const permission = normPerm(String(formData.get("permission") ?? "staff"));

  if (!loginId || !name || !password) {
    return { error: "Fill in username, name, and password (กรอกชื่อผู้ใช้ ชื่อ และรหัสผ่านให้ครบ)" };
  }
  if (password.length < 4) {
    return { error: "Password must be at least 4 characters (รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร)" };
  }

  const existing = await db.user.findUnique({ where: { email: loginId } });
  if (existing) {
    return { error: `"${loginId}" is already in use (ชื่อผู้ใช้นี้มีอยู่แล้ว)` };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({
    data: {
      email: loginId,
      passwordHash,
      name,
      role: role || "Warehouse Staff",
      permission,
      avatarInitials: initialsOf(name),
    },
  });

  revalidatePath("/settings");
  return {};
}

export async function updateUserPermissionAction(
  id: string,
  permission: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  await db.user.update({ where: { id }, data: { permission: normPerm(permission) } });
  revalidatePath("/settings");
  return {};
}

export async function deleteUserAction(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Not allowed" };
  }
  const count = await db.user.count();
  if (count <= 1) {
    return { error: "Cannot delete the last remaining user (ลบไม่ได้ เหลือผู้ใช้คนสุดท้าย)" };
  }
  await db.user.delete({ where: { id } });
  revalidatePath("/settings");
  return {};
}
