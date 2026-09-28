"use client";

import { useEffect, useState } from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
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

export function StockCardModal({
  code,
  name,
  open,
  onClose,
}: {
  code: string;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  useEffect(() => {
    if (open) getStockCardAction(code).then((res) => setRows(res.entries));
  }, [open, code]);

  const balance = rows && rows.length > 0 ? rows[rows.length - 1].balance : 0;

  return (
    <Modal open={open} onClose={onClose} width={720}>
      <ModalHeader
        title={
          <span>
            <span className="font-num text-[12px] text-[#9aa4b4]">{code}</span>{" "}
            {name} · Stock Card
          </span>
        }
        onClose={onClose}
        action={
          <a
            href={`/api/export/stock-card/${code}`}
            className="rounded-[8px] border border-[#e41e2b] bg-[#fdeced] px-2.5 py-1.5 text-[12px] font-semibold text-[#b0141f]"
          >
            ⤓ Excel
          </a>
        }
      />
      <div className="max-h-[420px] overflow-auto px-5 py-3">
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
            {(rows ?? []).map((r, i) => (
              <tr key={i} className="border-t border-[#eef1f5]">
                <td className="font-num py-2">{fmtDateBE(new Date(r.date))}</td>
                <td className="font-num py-2">{r.doc}</td>
                <td className="py-2">
                  <Badge tone={MOVEMENT_TYPE_TONE[r.type] ?? "neutral"}>
                    {r.type}
                  </Badge>
                </td>
                <td className="font-num py-2">{r.lot}</td>
                <td className="font-num py-2 text-right text-[#a8121c]">
                  {r.in > 0 ? `+${r.in.toLocaleString()}` : ""}
                </td>
                <td className="font-num py-2 text-right text-[#d24141]">
                  {r.out > 0 ? `−${r.out.toLocaleString()}` : ""}
                </td>
                <td className="font-num py-2 text-right font-semibold">
                  {r.balance.toLocaleString()}
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#9aa4b4]">
                  No movements yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[#eef1f5] px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
          <span className="text-[#69748a]">
            ยอดในสต็อก: <b className="font-num text-[#16202e]">{balance.toLocaleString()}</b>
          </span>
          <span className="flex-1" />
          <span className="text-[#9aa4b4]">As of {fmtDateBE(new Date())}</span>
        </div>
      </div>
    </Modal>
  );
}
