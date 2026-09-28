import "server-only";
import { db } from "@/lib/db";

export async function getUsers() {
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    permission: u.permission,
    avatarInitials: u.avatarInitials,
  }));
}

export type UserRow = Awaited<ReturnType<typeof getUsers>>[number];
