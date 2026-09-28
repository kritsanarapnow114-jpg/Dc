"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[#3a4658]">
          Username / Email (ชื่อผู้ใช้ / อีเมล)
        </span>
        <input
          name="email"
          type="text"
          required
          autoFocus
          className="rounded-[8px] border border-[#d7dce4] px-3 py-2.5 text-[13px] outline-none focus:border-[#2f86cf]"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[#3a4658]">
          Password (รหัสผ่าน)
        </span>
        <input
          name="password"
          type="password"
          required
          className="rounded-[8px] border border-[#d7dce4] px-3 py-2.5 text-[13px] outline-none focus:border-[#2f86cf]"
        />
      </label>
      {state.error && (
        <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1.5 rounded-[9px] bg-[#2f86cf] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in… (กำลังเข้าสู่ระบบ)" : "Sign in (เข้าสู่ระบบ)"}
      </button>
    </form>
  );
}
