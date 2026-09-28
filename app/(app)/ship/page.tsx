import Link from "next/link";
import { getShipOrders, getShipCustomers, getShipProducts } from "@/lib/views/ship";
import { NewShipButton } from "./NewShipModal";
import { ShipTable } from "./ShipTable";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "รอจัดส่ง" },
  { value: "PENDING", label: "ส่งบางส่วน" },
  { value: "COMPLETE", label: "ส่งครบแล้ว" },
];

export default async function ShipOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [rows, customers, products] = await Promise.all([
    getShipOrders({ status }),
    getShipCustomers(),
    getShipProducts(),
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
              href={`/ship${qs({ status: f.value })}`}
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
        <NewShipButton customers={customers} products={products} />
      </div>

      <ShipTable rows={rows} customers={customers} products={products} />
    </div>
  );
}
