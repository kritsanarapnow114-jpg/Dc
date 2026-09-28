"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Enter email and password (กรอกอีเมลและรหัสผ่าน)" };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid email or password (อีเมลหรือรหัสผ่านไม่ถูกต้อง)" };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid email or password (อีเมลหรือรหัสผ่านไม่ถูกต้อง)" };
  }

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permission: user.permission,
    avatarInitials: user.avatarInitials,
  });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
