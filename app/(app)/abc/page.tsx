import Link from "next/link";
import { getAbcAnalysis, AbcBasis, AbcClass } from "@/lib/views/abc";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Currency";

const CLASS_COLOR: Record<AbcClass, string> = { A: "#2f86cf", B: "#e59a2b", C: "#94a3b8" };
const CLASS_DESC: Record<AbcClass, string> = {
  A: "มูลค่าสูงสุด ~80% · คุมเข้ม นับบ่อย",
  B: "มูลค่ารองลงมา ~15% · คุมปานกลาง",
  C: "มูลค่าน้อย ~5% · คุมหลวม นับนานๆ ครั้ง",
};

export default async function AbcPage({
  searchParams,
}: {
  searchParams: Promise<{ basis?: string }>;
}) {
  const { basis: basisParam } = await searchParams;
  const basis: AbcBasis = basisParam === "usage" ? "usage" : "value";
  const { rows, summary, total } = await getAbcAnalysis(basis);

  const basisTabs: { value: AbcBasis; label: string }[] = [
    { value: "value", label: "มูลค่าคงคลัง (Inventory value)" },
    { value: "usage", label: "มูลค่าการใช้ 90 วัน (Usage value)" },
  ];

  return (
    <div className="max-w-[1280px] p-[22px_26px]">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {basisTabs.map((t) => {
          const active = basis === t.value;
          return (
            <Link
              key={t.value}
              href={`/abc?basis=${t.value}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                active ? "bg-[#2f86cf] text-white" : "border border-[#e2e6ec] bg-white text-[#3a4658]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <div className="text-[12px] text-[#69748a]">
          รวม {rows.length} SKU · มูลค่ารวม <b className="font-num text-[#16202e]"><Money value={total} /></b>
        </div>
        <a
          href={`/api/export/abc?basis=${basis}`}
          className="flex items-center gap-1.5 rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3.5 py-2 text-[12.5px] font-semibold text-[#0c7f93]"
        >
          ⤓ Export Excel
        </a>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["A", "B", "C"] as AbcClass[]).map((cls) => (
          <Card key={cls}>
            <div className="relative overflow-hidden">
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: CLASS_COLOR[cls] }}
              />
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] text-[18px] font-black text-white"
                  style={{ background: CLASS_COLOR[cls] }}
                >
                  {cls}
                </span>
                <div className="leading-tight">
                  <div className="font-num text-[20px] font-extrabold text-[#16202e]">
                    {summary[cls].count} <span className="text-[12px] font-medium text-[#9aa4b4]">SKU</span>
                  </div>
                  <div className="text-[11px] text-[#9aa4b4]">{summary[cls].skuPct.toFixed(0)}% ของรายการ</div>
                </div>
                <div className="flex-1" />
                <div className="text-right leading-tight">
                  <div className="font-num text-[15px] font-bold" style={{ color: CLASS_COLOR[cls] }}>
                    {summary[cls].pct.toFixed(1)}%
                  </div>
                  <div className="font-num text-[11.5px] text-[#69748a]">
                    <Money value={summary[cls].value} />
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-[#69748a]">{CLASS_DESC[cls]}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
                <th className="p-[10px_16px] text-[11.5px] font-medium">#</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Class</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">SAP Material Master</th>
                <th className="p-[10px_16px] text-[11.5px] font-medium">Material Description</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">On-hand</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">
                  {basis === "usage" ? "Usage value" : "Inventory value"}
                </th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">%</th>
                <th className="p-[10px_16px] text-right text-[11.5px] font-medium">Cum %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.code} className="border-t border-[#eef1f5]">
                  <td className="font-num p-[10px_16px] text-[12px] text-[#9aa4b4]">{i + 1}</td>
                  <td className="p-[10px_16px]">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] text-[11px] font-bold text-white"
                      style={{ background: CLASS_COLOR[r.cls] }}
                    >
                      {r.cls}
                    </span>
                  </td>
                  <td className="font-num p-[10px_16px] text-[12px] text-[#3a4658]">{r.code}</td>
                  <td className="p-[10px_16px] font-medium">{r.name}</td>
                  <td className="font-num p-[10px_16px] text-right text-[#69748a]">
                    {r.onHand.toLocaleString()} {r.unit}
                  </td>
                  <td className="font-num p-[10px_16px] text-right font-semibold">
                    <Money value={r.metric} />
                  </td>
                  <td className="font-num p-[10px_16px] text-right text-[#69748a]">{r.pct.toFixed(1)}%</td>
                  <td className="font-num p-[10px_16px] text-right text-[#69748a]">{r.cumPct.toFixed(1)}%</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#9aa4b4]">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
