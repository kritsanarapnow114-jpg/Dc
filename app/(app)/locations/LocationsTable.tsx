"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocationRow } from "@/lib/views/locations";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Tone } from "@/components/ui/tone";
import { deleteLocationAction } from "@/lib/actions/locations";
import { setBinExtrasAction } from "@/lib/actions/mapMove";
import { showToast } from "@/components/ui/Toast";
import { EditLocationModal } from "./EditLocationModal";

const STATUS_BADGE: Record<LocationRow["tone"], { tone: Tone; label: string }> = {
  ok: { tone: "ok", label: "OK (ปกติ)" },
  qc: { tone: "warn", label: "QC Hold (ติด QC)" },
  expired: { tone: "danger", label: "Expired (หมดอายุ)" },
  full: { tone: "danger", label: "Full (เต็ม)" },
  near: { tone: "warn", label: "Near full (ใกล้เต็ม)" },
  empty: { tone: "neutral", label: "Empty (ว่าง)" },
};

function dotColor(c: LocationRow["contents"][number]): string {
  if (c.expired) return "#d24141";
  if (c.lotStatus === "QC") return "#e59a2b";
  return "#2f86cf";
}

export function LocationsTable({
  rows,
  zoneLabels = {},
}: {
  rows: LocationRow[];
  zoneLabels?: Record<string, string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<LocationRow | null>(null);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [busyExtra, setBusyExtra] = useState(false);

  async function saveExtras(code: string, next: { id: string; label: string; pallets: number }[]) {
    setBusyExtra(true);
    const res = await setBinExtrasAction(code, next);
    setBusyExtra(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    router.refresh();
  }
  async function addExtra(cur: LocationRow) {
    const label = newLabel.trim();
    const qty = Math.max(1, Math.trunc(Number(newQty) || 1));
    if (!label || busyExtra) return;
    const id = `x${Date.now().toString(36)}`;
    await saveExtras(cur.code, [...cur.extras, { id, label, pallets: qty }]);
    setNewLabel("");
    setNewQty("1");
    showToast(`เพิ่ม “${label}” แล้ว`);
  }
  async function removeExtra(cur: LocationRow, id: string) {
    if (busyExtra) return;
    await saveExtras(cur.code, cur.extras.filter((e) => e.id !== id));
    showToast("ลบของอื่น ๆ แล้ว");
  }

  async function handleDelete(e: React.MouseEvent, row: LocationRow) {
    e.stopPropagation();
    if (!confirm(`Delete bin ${row.code}? (ลบที่เก็บนี้?)`)) return;
    try {
      const res = await deleteLocationAction(row.code);
      if (res?.error) {
        showToast(res.error);
        return;
      }
      showToast(`ลบที่เก็บ ${row.code} แล้ว`);
      router.refresh();
    } catch {
      showToast("ลบที่เก็บไม่สำเร็จ (failed to delete location)");
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[#e7ebf1] bg-white shadow-[0_1px_2px_rgba(20,30,48,.04),0_6px_18px_rgba(20,30,48,.035)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f7f9fb] text-left text-[#69748a]">
              <Th>Bin</Th>
              <Th>Zone</Th>
              <Th>Contents · Lot (สินค้าในช่อง)</Th>
              <Th align="right">Used / Cap (m²)</Th>
              <Th>Utilization</Th>
              <Th>Status (สถานะ)</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const badge = STATUS_BADGE[r.tone];
              return (
                <tr
                  key={r.code}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-t border-[#eef1f5] align-top hover:bg-[#f7f9fb]"
                >
                  <Td className="font-num text-[12px] text-[#3a4658]">
                    {r.code}
                    {r.stackUsed != null && r.stackUsed < r.stackMax && (
                      <div className="mt-1 inline-block rounded-[5px] bg-[#eaf1fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#2f6f9e]">
                        ซ้อนจริง ×{r.stackUsed}
                      </div>
                    )}
                  </Td>
                  <Td className="text-[#69748a]">
                    Zone {r.zone}
                    <div className="text-[11px] text-[#9aa4b4]">
                      {zoneLabels[r.zone] ?? r.zoneLabel}
                    </div>
                  </Td>
                  <Td>
                    {r.contents.length === 0 ? (
                      <span className="text-[#9aa4b4]">— empty (ว่าง) —</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {r.contents.map((c, i) => (
                          <div key={i} className="leading-tight">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 flex-none rounded-full"
                                style={{ background: dotColor(c) }}
                              />
                              <span className="font-medium">{c.nameEn}</span>
                              <span className="font-num text-[10.5px] text-[#9aa4b4]">
                                {c.productCode}
                              </span>
                              <span className="font-num text-[10.5px] text-[#9aa4b4]">
                                · {c.lotNo}
                              </span>
                            </div>
                            <div className="font-num pl-3.5 text-[11px] text-[#9aa4b4]">
                              {c.qty.toLocaleString()} {c.unit} · {c.area.toFixed(2)} m² (ซ้อน ×
                              {c.isExtra
                                ? c.stackLevels
                                : r.stackUsed != null
                                  ? Math.min(c.stackLevels, r.stackUsed)
                                  : c.stackLevels}
                              )
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td align="right" className="font-num">
                    {r.usedArea.toFixed(1)} / {r.capArea.toFixed(1)}
                    <div className="text-[11px] text-[#9aa4b4]">
                      {r.width}×{r.length} m
                    </div>
                  </Td>
                  <Td>
                    <div className="w-[130px]">
                      <ProgressBar pct={r.pct} color={r.barColor} height={9} />
                      <div className="font-num mt-1 text-[11px] text-[#69748a]">{r.pct}%</div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(r);
                        }}
                        className="cursor-pointer border-0 bg-transparent text-[14px] text-[#69748a] hover:text-[#3a4658]"
                      >
                        ✎
                      </button>
                      <button
                        title="Delete"
                        onClick={(e) => handleDelete(e, r)}
                        className="cursor-pointer border-0 bg-transparent text-[15px] text-[#c2606f]"
                      >
                        🗑
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[#9aa4b4]">
                  No bins found (ไม่พบที่เก็บ)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} width={640}>
        {selected && (() => {
          // Use the freshest row so the panel updates after add/remove.
          const cur = rows.find((r) => r.code === selected.code) ?? selected;
          return (
          <>
            <ModalHeader
              title={
                <span>
                  <span className="font-num text-[12px] text-[#9aa4b4]">{cur.code}</span>{" "}
                  Zone {cur.zone} · Bin Contents
                </span>
              }
              onClose={() => setSelected(null)}
            />
            <div className="max-h-[300px] overflow-auto px-5 py-3">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9aa4b4]">
                    <th className="py-2 font-medium">Material Description</th>
                    <th className="py-2 font-medium">SAP Material Master</th>
                    <th className="py-2 font-medium">Lot</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Area (m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {cur.contents.map((c, i) => (
                    <tr key={i} className="border-t border-[#eef1f5]">
                      <td className="py-2 font-medium">{c.nameEn}</td>
                      <td className="font-num py-2">{c.productCode}</td>
                      <td className="font-num py-2">{c.lotNo}</td>
                      <td className="font-num py-2 text-right">
                        {c.qty.toLocaleString()} {c.unit}
                      </td>
                      <td className="font-num py-2 text-right">{c.area.toFixed(2)}</td>
                    </tr>
                  ))}
                  {cur.contents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#9aa4b4]">
                        Empty bin (ว่าง)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Non-stock items (Reuse, empty pallets…) */}
            <div className="border-t border-[#eef1f5] bg-[#faf7f2] px-5 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[13px]">♻️</span>
                <span className="text-[12px] font-bold text-[#7a6a55]">
                  ของอื่น ๆ ในช่องนี้ ({cur.extras.length})
                </span>
                <span className="text-[10.5px] text-[#a99a86]">ไม่ใช่สินค้าในระบบ · เช่น Reuse, พาเลทเปล่า</span>
              </div>
              {cur.extras.length > 0 && (
                <div className="mb-2 flex flex-col gap-1.5">
                  {cur.extras.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-[9px] border border-[#ece3d6] bg-white px-2.5 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#5f5340]">{e.label}</span>
                      <span className="font-num flex-none text-[11.5px] text-[#a2937d]">{e.pallets} พาเลท</span>
                      <button
                        onClick={() => removeExtra(cur, e.id)}
                        disabled={busyExtra}
                        className="flex-none rounded-[6px] border border-[#e2d6c6] px-1.5 py-0.5 text-[11px] text-[#a5795f] hover:bg-[#f3ece2] disabled:opacity-50"
                        title="ลบ"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  value={newLabel}
                  onChange={(ev) => setNewLabel(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === "Enter") addExtra(cur); }}
                  placeholder="ชื่อของ เช่น Reuse / พาเลทเปล่า / อุปกรณ์"
                  className="min-w-0 flex-1 rounded-[8px] border border-[#dccfbd] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-[#b79a72]"
                />
                <input
                  value={newQty}
                  onChange={(ev) => setNewQty(ev.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  title="จำนวนพาเลท/จุดที่วาง"
                  className="font-num w-[52px] flex-none rounded-[8px] border border-[#dccfbd] bg-white px-2 py-1.5 text-center text-[12.5px] outline-none focus:border-[#b79a72]"
                />
                <button
                  onClick={() => addExtra(cur)}
                  disabled={busyExtra || !newLabel.trim()}
                  className="flex-none rounded-[8px] bg-[#9a7b52] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#846943] disabled:opacity-50"
                >
                  + เพิ่ม
                </button>
              </div>
            </div>
          </>
          );
        })()}
      </Modal>

      {editing && (
        <EditLocationModal location={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}
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
