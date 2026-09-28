import Link from "next/link";
import { searchAll } from "@/lib/views/search";

const TAG_COLOR: Record<string, string> = {
  Product: "#2f86cf",
  PO: "#7b6ef0",
  GR: "#2aa775",
  GI: "#e59a2b",
  Lot: "#3f9aa8",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const res = await searchAll(q);

  return (
    <div className="max-w-[900px] p-[22px_26px]">
      <div className="mb-4">
        <div className="text-[13px] text-[#69748a]">
          ผลการค้นหา · {res.total} รายการ สำหรับ
        </div>
        <div className="text-[20px] font-bold text-[#16202e]">“{q}”</div>
      </div>

      {!q.trim() ? (
        <div className="rounded-[12px] border border-[#e7ebf1] bg-white p-8 text-center text-[13px] text-[#9aa4b4]">
          พิมพ์คำค้นหาที่ช่องด้านบน — ค้นได้ทั้ง สินค้า, PO, Invoice, เลข Material Document (SAP) และ Lot
        </div>
      ) : res.total === 0 ? (
        <div className="rounded-[12px] border border-[#e7ebf1] bg-white p-8 text-center text-[13px] text-[#9aa4b4]">
          ไม่พบข้อมูลที่ตรงกับ “{q}” — ลองใช้รหัสสินค้า, เลข PO, Invoice, Material Document หรือ Lot
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {res.groups.map((g) => (
            <div key={g.label}>
              <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#69748a]">
                {g.label} ({g.hits.length})
              </div>
              <div className="flex flex-col gap-2">
                {g.hits.map((h, i) => (
                  <Link
                    key={i}
                    href={h.href}
                    className="flex items-center gap-3 rounded-[12px] border border-[#e7ebf1] bg-white px-4 py-3 transition hover:border-[#2f86cf] hover:shadow-[0_4px_14px_rgba(20,30,48,.06)]"
                  >
                    <span
                      className="flex-none rounded-[6px] px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: TAG_COLOR[h.tag] ?? "#8a94a6" }}
                    >
                      {h.tag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-[#16202e]">{h.title}</div>
                      <div className="truncate text-[11.5px] text-[#8a92a8]">{h.subtitle}</div>
                    </div>
                    <span className="flex-none text-[#c2ccd8]">›</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
