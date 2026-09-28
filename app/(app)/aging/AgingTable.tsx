"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Currency";
import { buttonClass } from "@/components/ui/Button";
import { fmtDateBE } from "@/lib/calc/date";
import { Tone } from "@/components/ui/tone";
import { AgingRow } from "@/lib/views/aging";
import { ExtendShelfLifeModal, ExtendTarget } from "./ExtendShelfLifeModal";

const EXP_TONE: Record<AgingRow["expKind"], Tone> = {
  ok: "ok",
  near: "warn",
  expired: "danger",
  none: "neutral",
};

export function AgingTable({ rows }: { rows: AgingRow[] }) {
  const [selected, setSelected] = useState<ExtendTarget | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
              <Th>SAP Material Master</Th>
              <Th>Material Description</Th>
              <Th>Lot</Th>
              <Th>ที่เก็บ (bins)</Th>
              <Th align="right">On Hand (คงเหลือ)</Th>
              <Th align="right">Value (มูลค่า)</Th>
              <Th>Received (รับเข้า)</Th>
              <Th align="right">Age (อายุ)</Th>
              <Th>MFD</Th>
              <Th>EXP</Th>
              <Th align="right">Days left (เหลือ)</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const daysLeftColor =
                r.expKind === "expired"
                  ? "#d24141"
                  : r.expKind === "near"
                    ? "#c9821f"
                    : r.expKind === "none"
                      ? "#9aa4b4"
                      : "#1f66a6";
              const isOpen = expanded.has(r.lotKey);
              return (
                <Fragment key={r.lotKey}>
                  <tr className="border-t border-[#eef1f5] hover:bg-[#f7f9fb]">
                    <Td className="font-num text-[12px] text-[#3a4658]">{r.code}</Td>
                    <Td className="font-medium">{r.nameEn}</Td>
                    <Td className="font-num text-[12px] text-[#69748a]">{r.lotNo}</Td>
                    <Td>
                      <button
                        onClick={() => toggle(r.lotKey)}
                        className="flex items-center gap-1 rounded-[7px] border border-[#dce2ea] bg-white px-2 py-1 text-[11.5px] font-medium text-[#5b6473] hover:border-[#2f86cf] hover:text-[#2f86cf]"
                      >
                        <span className="font-num text-[9px]">{isOpen ? "▼" : "▶"}</span>
                        {r.bins.length === 1
                          ? r.bins[0].locationCode
                          : `${r.bins.length} ที่เก็บ`}
                      </button>
                    </Td>
                    <Td align="right" className="font-num">
                      {r.onHand.toLocaleString()} {r.unit}
                    </Td>
                    <Td align="right" className="font-num font-semibold">
                      <Money value={r.value} />
                    </Td>
                    <Td className="font-num text-[12px] text-[#69748a]">
                      {fmtDateBE(new Date(r.recvDate))}
                    </Td>
                    <Td align="right" className="font-num">
                      {r.ageDays}
                    </Td>
                    <Td className="font-num text-[12px] text-[#69748a]">
                      {r.mfgDate ? fmtDateBE(new Date(r.mfgDate)) : "—"}
                    </Td>
                    <Td>
                      <Badge tone={EXP_TONE[r.expKind]}>
                        {r.expKind === "none" ? "— none —" : r.expLabel}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <div className="font-num font-semibold" style={{ color: daysLeftColor }}>
                        {r.daysLeft === null ? "—" : `${r.daysLeft}d`}
                      </div>
                      <div className="font-num text-[10.5px] text-[#9aa4b4]">
                        <Money value={r.value} />
                        {(r.expKind === "near" || r.expKind === "expired") && " at risk"}
                      </div>
                    </Td>
                    <Td align="center">
                      <button
                        onClick={() =>
                          setSelected({
                            lotIds: r.lotIds,
                            code: r.code,
                            nameEn: r.nameEn,
                            lotNo: r.lotNo,
                            mfgDate: r.mfgDate,
                            expDate: r.expDate,
                          })
                        }
                        className={buttonClass("secondary", "text-[11.5px]")}
                      >
                        ต่ออายุ (extend)
                      </button>
                    </Td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-[#eef1f5] bg-[#fafbfc]">
                      <td colSpan={12} className="p-[6px_9px_10px_30px]">
                        <div className="flex flex-col gap-1.5">
                          {r.bins.map((b) => (
                            <div
                              key={b.lotId}
                              className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[12px] text-[#5b6473]"
                            >
                              <span className="font-num inline-block min-w-[70px] font-semibold text-[#3a4658]">
                                📍 {b.locationCode}
                              </span>
                              <span className="font-num">
                                {b.onHand.toLocaleString()} {r.unit}
                              </span>
                              <span className="font-num text-[#69748a]">
                                <Money value={b.value} />
                              </span>
                              <span className="font-num text-[11px] text-[#9aa4b4]">
                                รับเข้า {fmtDateBE(new Date(b.recvDate))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="p-6 text-center text-[#9aa4b4]">
                  No lots found for this filter (ไม่พบข้อมูล)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ExtendShelfLifeModal
        key={selected?.lotIds.join(",") ?? "none"}
        target={selected}
        onClose={() => setSelected(null)}
      />
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
