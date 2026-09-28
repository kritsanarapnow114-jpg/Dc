import Link from "next/link";
import { getPurchaseOrders, getProductPickerList, getVendorNames } from "@/lib/views/po";
import { NewPoButton } from "./NewPoModal";
import { PoTable } from "./PoTable";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETE", label: "Complete" },
];

export default async function PurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [rows, products, vendors] = await Promise.all([
    getPurchaseOrders({ status }),
    getProductPickerList(),
    getVendorNames(),
  ]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
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
        {STATUS_FILTERS.map((f) => {
          const active = (status ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={`/po${qs({ status: f.value })}`}
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
        <NewPoButton products={products} vendors={vendors} />
        <a
          href={`/api/export/po${qs({})}`}
          className="flex items-center gap-1.5 rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3.5 py-2 text-[12.5px] font-semibold text-[#0c7f93]"
        >
          ⤓ Export Excel
        </a>
      </div>

      <PoTable rows={rows} products={products} />
    </div>
  );
}
