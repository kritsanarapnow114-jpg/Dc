"use client";

import { useState } from "react";
import { ProductRow } from "@/lib/views/products";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Currency";
import { deleteProductAction } from "@/lib/actions/products";
import { reorderStatus, REORDER_COLOR, effectiveLevels } from "@/lib/calc/reorder";
import { showToast } from "@/components/ui/Toast";
import { ProductDrawer } from "./ProductDrawer";

export function ProductsTable({
  rows,
}: {
  rows: ProductRow[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <table className="w-full min-w-[940px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
              <Th>SAP Material Master</Th>
              <Th>Material Description</Th>
              <Th>Category (หมวด)</Th>
              <Th align="right">On Hand (คงเหลือ)</Th>
              <Th align="right">Unit Price (ราคา)</Th>
              <Th align="right">Total Value (มูลค่ารวม)</Th>
              <Th align="right">Min / Max (จุดสั่งซื้อ)</Th>
              <Th align="right">Pallet size (ขนาดพาเลท)</Th>
              <Th>Location (ที่เก็บ)</Th>
              <Th>Status (สถานะ)</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const eff = effectiveLevels(p.minQty, p.maxQty, p.autoMin, p.autoMax);
              const rs = reorderStatus(p.onHand, eff.min, eff.max);
              return (
              <tr
                key={p.code}
                onClick={() => setSelected(p.code)}
                className="cursor-pointer border-t border-[#eef1f5] hover:bg-[#f7f9fb]"
              >
                <Td className="font-num text-[12px] text-[#3a4658]">
                  {p.code}
                </Td>
                <Td className="font-medium">{p.nameEn}</Td>
                <Td className="text-[#69748a]">{p.categoryLabel}</Td>
                <Td align="right" className="font-num">
                  <span className="whitespace-nowrap">
                    {p.onHand.toLocaleString()} {p.unit}
                    {(rs === "low" || rs === "over") && (
                      <span
                        className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: REORDER_COLOR[rs].bg, color: REORDER_COLOR[rs].text }}
                        title={rs === "low" ? "ต่ำกว่า Min — ควรสั่งซื้อ" : "เกิน Max"}
                      >
                        {rs === "low" ? "Low" : "Over"}
                      </span>
                    )}
                  </span>
                </Td>
                <Td align="right" className="font-num">
                  <Money value={p.price} />
                </Td>
                <Td align="right" className="font-num font-semibold">
                  <Money value={p.totalValue} />
                </Td>
                <Td align="right" className="font-num text-[12px] text-[#69748a]">
                  {eff.min || eff.max ? (
                    <span
                      className="whitespace-nowrap"
                      title={
                        eff.minAuto || eff.maxAuto
                          ? "คำนวณอัตโนมัติจากการใช้จริง (auto)"
                          : "กำหนดเอง (manual)"
                      }
                    >
                      {eff.min ? eff.min.toLocaleString() : "—"} / {eff.max ? eff.max.toLocaleString() : "—"}
                      {(eff.minAuto || eff.maxAuto) && (
                        <span className="ml-1 rounded-[4px] bg-[#eef1f5] px-1 text-[9px] text-[#8a97a5]">auto</span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td align="right" className="font-num text-[12px] text-[#69748a]">
                  {p.pallet.toLocaleString()} {p.unit}/pallet
                </Td>
                <Td className="font-num text-[12px] text-[#69748a]">
                  {p.locations[0] ?? "—"}
                  {p.locations.length > 1 ? ` +${p.locations.length - 1}` : ""}
                </Td>
                <Td>
                  <Badge tone={p.status === "qc" ? "warn" : "ok"}>
                    {p.status === "qc" ? "QC Hold (ติด QC)" : "Available (พร้อมใช้)"}
                  </Badge>
                </Td>
                <Td align="center">
                  <button
                    title="Delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete ${p.code}? (ลบสินค้านี้?)`)) return;
                      await deleteProductAction(p.code);
                      showToast(`Deleted ${p.code}`);
                    }}
                    className="cursor-pointer border-0 bg-transparent text-[15px] text-[#c2606f]"
                  >
                    🗑
                  </button>
                </Td>
              </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-[#9aa4b4]">
                  No products found (ไม่พบสินค้า)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductDrawer code={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`p-[11px_9px] text-[11.5px] font-medium ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={`p-[12px_9px] ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      {children}
    </td>
  );
}
