"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { UserRow } from "@/lib/views/users";
import {
  createUserAction,
  deleteUserAction,
  updateUserPermissionAction,
  FormState,
} from "@/lib/actions/users";
import { showToast } from "@/components/ui/Toast";
import { PERMISSION_OPTIONS, PERMISSION_LABEL } from "@/lib/permissions";

export function UsersCard({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await createUserAction(prev, fd);
      if (!res.error) {
        showToast("User added");
        setAdding(false);
        router.refresh();
      }
      return res;
    },
    {}
  );

  return (
    <Card className="mt-4">
      <div className="mb-3.5 flex items-center gap-3">
        <div className="flex-1 text-[14px] font-semibold">Users (ผู้ใช้งาน)</div>
        <button onClick={() => setAdding((a) => !a)} className={buttonClass("accent")}>
          ＋ Add user (เพิ่มผู้ใช้)
        </button>
      </div>

      {adding && (
        <form action={formAction} className="mb-4 flex flex-wrap items-end gap-2 rounded-[10px] bg-[#f7f9fb] p-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">Username / Email</span>
            <input name="email" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">Name</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">Password</span>
            <input name="password" type="password" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">Role</span>
            <input name="role" placeholder="Warehouse Staff" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-[#69748a]">สิทธิ์ (Permission)</span>
            <select name="permission" defaultValue="staff" className={inputClass}>
              {PERMISSION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PERMISSION_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Adding…" : "Add"}
          </button>
        </form>
      )}
      {state.error && (
        <div className="mb-3 rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">
          {state.error}
        </div>
      )}

      <div className="flex flex-col">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 border-t border-[#eef1f5] py-2.5 text-[13px] first:border-t-0"
          >
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e4f4f8] text-[11.5px] font-semibold text-[#0e7488]">
              {u.avatarInitials}
            </div>
            <div className="flex-1">
              <div className="font-medium">{u.name}</div>
              <div className="font-num text-[11.5px] text-[#9aa4b4]">{u.email}</div>
            </div>
            <select
              value={u.permission}
              onChange={async (e) => {
                const res = await updateUserPermissionAction(u.id, e.target.value);
                if (res.error) showToast(res.error);
                else {
                  showToast("Permission updated (แก้สิทธิ์แล้ว)");
                  router.refresh();
                }
              }}
              className="rounded-[7px] border border-[#d7dce4] px-2 py-1 text-[11.5px] outline-none focus:border-[#2f86cf]"
            >
              {PERMISSION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PERMISSION_LABEL[p]}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!confirm(`Delete user ${u.name}?`)) return;
                const res = await deleteUserAction(u.id);
                if (res.error) showToast(res.error);
                else {
                  showToast("User deleted");
                  router.refresh();
                }
              }}
              className="text-[15px] text-[#c2606f]"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

const inputClass =
  "rounded-[7px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[#2f86cf]";
