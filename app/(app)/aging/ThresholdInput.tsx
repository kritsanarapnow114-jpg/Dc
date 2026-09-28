"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ThresholdInput({
  filter,
  threshold,
}: {
  filter: string;
  threshold: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(threshold);

  function go(v: number) {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("filter", filter);
    if (v && v !== 30) p.set("threshold", String(v));
    const s = p.toString();
    router.push(`/aging${s ? `?${s}` : ""}`);
  }

  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[#69748a]">
      Near-expiry ≤
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value) || 0;
          setValue(v);
          if (v > 0) go(v);
        }}
        className="font-num w-[64px] rounded-[8px] border border-[#d7dce4] px-2 py-1.5 text-center text-[12.5px] outline-none focus:border-[#2f86cf]"
      />
      days (เตือนล่วงหน้า)
    </label>
  );
}
