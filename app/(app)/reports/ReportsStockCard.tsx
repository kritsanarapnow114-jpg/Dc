"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getStockCardAction } from "@/lib/actions/products";
import { MOVEMENT_TYPE_TONE } from "@/components/ui/tone";
import { fmtDateBE } from "@/lib/calc/date";

type Entry = {
  date: string;
  doc: string;
  type: string;
  lot: string;
  in: number;
  out: number;
  balance: number;
};

export function ReportsStockCard({
  products,
  start,
  end,
}: {
  products: { code: string; name: string }[];
  start: string;
  end: string;
}) {
  const [code, setCode] = useState(products[0]?.code ?? "");
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [rowsCode, setRowsCode] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    getStockCardAction(code).then((r) => {
      setRows(r.entries);
      setRowsCode(code);
    });
  }, [code]);

  const shown = rowsCode === code ? rows : null;

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime() + 86400000 - 1;
  const filtered = (shown ?? []).filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= startTime && t <= endTime;
  });

  return (
    <Card className="mt-4">
      <CardTitle
        action={
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-[8px] border border-[#d7dce4] px-2.5 py-1.5 text-[12.5px]"
          >
            {products.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        }
      >
        Stock Card (การ์ดสต็อก) · within period
      </CardTitle>
      <div className="max-h-[380px] overflow-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="sticky top-0 bg-white text-left text-[#9aa4b4]">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Doc No.</th>
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Lot</th>
              <th className="py-2 text-right font-medium">In</th>
              <th className="py-2 text-right font-medium">Out</th>
              <th className="py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-[#eef1f5]">
                <td className="font-num py-2">{fmtDateBE(new Date(r.date))}</td>
                <td className="font-num py-2">{r.doc}</td>
                <td className="py-2">
                  <Badge tone={MOVEMENT_TYPE_TONE[r.type] ?? "neutral"}>{r.type}</Badge>
                </td>
                <td className="font-num py-2">{r.lot}</td>
                <td className="font-num py-2 text-right text-[#1f66a6]">
                  {r.in > 0 ? `+${r.in.toLocaleString()}` : ""}
                </td>
                <td className="font-num py-2 text-right text-[#d24141]">
                  {r.out > 0 ? `−${r.out.toLocaleString()}` : ""}
                </td>
                <td className="font-num py-2 text-right font-semibold">{r.balance.toLocaleString()}</td>
              </tr>
            ))}
            {shown && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#9aa4b4]">
                  No movements for this product in the selected period
                </td>
              </tr>
            )}
            {shown === null && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#9aa4b4]">
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
