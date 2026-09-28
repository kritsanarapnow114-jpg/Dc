"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

/** Type-to-search product box; switching product keeps the chosen period. */
export function ProductPicker({
  products,
  code,
}: {
  products: { code: string; name: string }[];
  code: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const current = products.find((p) => p.code === code);

  return (
    <SearchableSelect
      options={products.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))}
      value={current ? `${current.code} · ${current.name}` : ""}
      placeholder="พิมพ์ค้นหารหัส / ชื่อสินค้า…"
      className="w-full rounded-[9px] border border-[#d7dce4] bg-white px-3 py-2 text-[13px] text-[#16202e] outline-none focus:border-[#d71f28]"
      onSelect={(v) => {
        const qs = new URLSearchParams(params.toString());
        qs.set("code", v);
        router.push(`/stock-card?${qs.toString()}`);
      }}
    />
  );
}
