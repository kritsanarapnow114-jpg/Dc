import Link from "next/link";
import { getProductRows } from "@/lib/views/products";
import { Card, CardTitle } from "@/components/ui/Card";
import { Money } from "@/components/ui/Currency";
import { AddProductButton } from "./AddProductModal";
import { ProductsTable } from "./ProductsTable";

const CATEGORY_FILTERS = [
  { value: "", label: "All" },
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "FINISHED_GOODS", label: "Finished (สำเร็จรูป)" },
  { value: "SPARE_PARTS", label: "IO & Resin" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const rows = await getProductRows({ q, category: cat });
  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);
  const maxValue = Math.max(1, ...rows.map((r) => r.totalValue));
  const sortedByValue = [...rows].sort((a, b) => b.totalValue - a.totalValue);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("cat", cat);
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="max-w-[1280px] p-[22px_26px]">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {CATEGORY_FILTERS.map((f) => {
          const active = (cat ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={`/products${qs({ cat: f.value })}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                active
                  ? "bg-[#2f86cf] text-white"
                  : "border border-[#e2e6ec] bg-white text-[#3a4658]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <div className="text-[12px] text-[#69748a]">
          Total value (มูลค่ารวม):{" "}
          <b className="font-num text-[#16202e]">
            <Money value={totalValue} />
          </b>
        </div>
        <AddProductButton />
        <a
          href={`/api/export/products${qs({})}`}
          className="flex items-center gap-1.5 rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3.5 py-2 text-[12.5px] font-semibold text-[#0c7f93]"
        >
          ⤓ Export Excel
        </a>
      </div>

      <ProductsTable rows={rows} />

      <Card className="mt-4">
        <CardTitle>Inventory Value by Product (มูลค่าคงเหลือรายสินค้า)</CardTitle>
        <div className="flex flex-col gap-3">
          {sortedByValue.map((v) => (
            <div key={v.code} className="flex items-center gap-3">
              <div className="w-[210px] flex-none text-[12.5px] leading-tight">
                <span className="font-medium">{v.nameEn}</span>{" "}
                <span className="font-num text-[10.5px] text-[#9aa4b4]">
                  {v.code}
                </span>
              </div>
              <div className="h-[14px] flex-1 overflow-hidden rounded-[5px] bg-[#f1f3f7]">
                <div
                  className="h-full rounded-[5px] bg-[#2f86cf]"
                  style={{ width: `${(v.totalValue / maxValue) * 100}%` }}
                />
              </div>
              <div className="font-num w-[110px] text-right text-[12.5px]">
                <Money value={v.totalValue} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
