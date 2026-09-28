"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { containerDef } from "@/lib/containerTypes";
import { moveLotAction, swapLocationsAction, setMapOrderAction, setBinSlotMapAction, setBinExtrasAction, setBinStackAction } from "@/lib/actions/mapMove";
import { showToast } from "@/components/ui/Toast";
import type { RackZone, FloorZone, MapSummary, MapCell, MapLot, SlotEntry } from "@/lib/views/mapLocation";

// Build a stable, well-spread colour per product so each product reads as its
// own colour across the whole map (golden-angle hue spacing = distinct hues).
type ProductColors = {
  colorOf: (code: string) => string;
  products: { code: string; name: string; color: string }[];
};
// Neutral / earth tones for non-stock "extra" items so they read as clearly
// different from the colourful product pallets.
const EXTRA_COLORS = ["#8a6d5a", "#6d7f8a", "#7a8a6d", "#8a7a5a", "#7d6d8a", "#5a7a7a"];
function extraColor(i: number) {
  return EXTRA_COLORS[((i % EXTRA_COLORS.length) + EXTRA_COLORS.length) % EXTRA_COLORS.length];
}

function buildProductColors(racks: RackZone[], floors: FloorZone[]): ProductColors {
  const names = new Map<string, string>();
  for (const r of racks) for (const b of r.bays) for (const c of b.levels) for (const l of c.lots) if (!l.isExtra) names.set(l.productCode, l.name);
  for (const f of floors) for (const c of f.tiles) for (const l of c.lots) if (!l.isExtra) names.set(l.productCode, l.name);
  const map = new Map<string, string>();
  const products = [...names.keys()].sort().map((code, i) => {
    const hue = Math.round((i * 137.508) % 360);
    const light = 44 + ((i % 3) * 6); // small lightness jitter to separate near hues
    const color = `hsl(${hue} 60% ${light}%)`;
    map.set(code, color);
    return { code, name: names.get(code) ?? code, color };
  });
  return { colorOf: (code: string) => map.get(code) ?? "#8a94a6", products };
}

type StatusKey = "free" | "partial" | "full";

const STATUS: Record<StatusKey, { label: string; color: string; bg: string; border: string }> = {
  free: { label: "ว่าง", color: "#1f9d63", bg: "#eaf7f0", border: "#bfe6cf" },
  partial: { label: "มีบางส่วน", color: "#c8781f", bg: "#fdf5ea", border: "#f4dcbb" },
  full: { label: "เต็ม", color: "#c0453f", bg: "#fdecec", border: "#f5cbc9" },
};
const ACCENT = "#2f86cf";

function pct(used: number, cap: number) {
  return cap > 0 ? Math.round((used / cap) * 100) : 0;
}

export function MapLocation({
  racks,
  floors,
  summary,
  zones,
  locationCodes,
}: {
  racks: RackZone[];
  floors: FloorZone[];
  summary: MapSummary;
  zones: string[];
  locationCodes: string[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | StatusKey>("all");
  const [zone, setZone] = useState<string>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSrc, setSwapSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Arrange (drag-to-reorder the layout) mode
  const [arrangeMode, setArrangeMode] = useState(false);
  const [layout, setLayout] = useState<Record<string, string[]>>({});
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragZoneId, setDragZoneId] = useState<string | null>(null);

  // Map each rack bay to its member location codes, so saving a bay order can
  // expand into the underlying location codes.
  const bayMembers = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const r of racks) for (const b of r.bays) m[b.bayCode] = b.levels.map((c) => c.code);
    return m;
  }, [racks]);

  // Seed the working layout from the (server-sorted) data whenever it changes.
  useEffect(() => {
    const next: Record<string, string[]> = {};
    for (const f of floors) next[`floor:${f.zone}`] = f.tiles.map((t) => t.code);
    for (const r of racks) next[`rack:${r.zone}`] = r.bays.map((b) => b.bayCode);
    setLayout(next);
  }, [racks, floors]);

  async function persistOrder(zoneId: string, keys: string[]) {
    const orderedCodes = zoneId.startsWith("floor:")
      ? keys
      : keys.flatMap((bc) => bayMembers[bc] ?? []);
    setBusy(true);
    const res = await setMapOrderAction(orderedCodes);
    setBusy(false);
    if (res.error) showToast(res.error);
    else {
      showToast("บันทึกผังแล้ว");
      router.refresh();
    }
  }

  function handleDrop(zoneId: string, targetKey: string) {
    if (!dragKey || dragZoneId !== zoneId || dragKey === targetKey) {
      setDragKey(null);
      setDragZoneId(null);
      return;
    }
    const cur = layout[zoneId] ?? [];
    const arr = cur.filter((k) => k !== dragKey);
    const idx = arr.indexOf(targetKey);
    arr.splice(idx < 0 ? arr.length : idx, 0, dragKey);
    setLayout((L) => ({ ...L, [zoneId]: arr }));
    const moved = dragKey;
    setDragKey(null);
    setDragZoneId(null);
    persistOrder(zoneId, arr);
    void moved;
  }

  async function handleTileClick(code: string) {
    if (arrangeMode) return; // in arrange mode, clicks don't open the drawer
    if (!swapMode) {
      setSelId(code);
      return;
    }
    if (busy) return;
    if (!swapSrc) {
      setSwapSrc(code);
      return;
    }
    if (swapSrc === code) {
      setSwapSrc(null);
      return;
    }
    setBusy(true);
    const res = await swapLocationsAction(swapSrc, code);
    setBusy(false);
    if (res.error) showToast(res.error);
    else {
      showToast(`สลับ ${swapSrc} ↔ ${code} แล้ว`);
      router.refresh();
    }
    setSwapSrc(null);
  }

  const { colorOf: productColor, products: productList } = useMemo(
    () => buildProductColors(racks, floors),
    [racks, floors]
  );
  const [showLegend, setShowLegend] = useState(false);

  const q = search.trim().toLowerCase();
  const matchCell = useMemo(() => {
    return (c: MapCell) => {
      if (status !== "all" && c.status !== status) return false;
      if (zone !== "all" && c.zone !== zone) return false;
      if (q) {
        const hit =
          c.code.toLowerCase().includes(q) ||
          c.lots.some(
            (l) =>
              l.name.toLowerCase().includes(q) ||
              l.productCode.toLowerCase().includes(q) ||
              l.lotNo.toLowerCase().includes(q)
          );
        if (!hit) return false;
      }
      return true;
    };
  }, [q, status, zone]);

  // find selected cell across all zones
  const selCell = useMemo(() => {
    for (const r of racks) for (const b of r.bays) for (const c of b.levels) if (c.id === selId) return c;
    for (const f of floors) for (const c of f.tiles) if (c.id === selId) return c;
    return null;
  }, [selId, racks, floors]);

  // In arrange mode, ignore status/search filters (only the zone chip applies)
  // so a whole zone can be reordered; otherwise honour every filter.
  const cellPass = (c: MapCell) => (arrangeMode ? true : matchCell(c));
  const orderBays = (zoneId: string, bays: RackZone["bays"]) => {
    const ord = layout[zoneId];
    if (!ord) return bays;
    return [...bays].sort((a, b) => ord.indexOf(a.bayCode) - ord.indexOf(b.bayCode));
  };
  const orderTiles = (zoneId: string, tiles: MapCell[]) => {
    const ord = layout[zoneId];
    if (!ord) return tiles;
    return [...tiles].sort((a, b) => ord.indexOf(a.code) - ord.indexOf(b.code));
  };

  const visRacks = racks
    .filter((r) => zone === "all" || r.zone === zone)
    .map((r) => ({
      ...r,
      bays: orderBays(
        `rack:${r.zone}`,
        r.bays
          .map((b) => ({ ...b, levels: b.levels.filter(cellPass) }))
          .filter((b) => b.levels.length > 0)
      ),
    }))
    .filter((r) => r.bays.length > 0);
  const visFloors = floors
    .filter((f) => zone === "all" || f.zone === zone)
    .map((f) => ({ ...f, tiles: orderTiles(`floor:${f.zone}`, f.tiles.filter(cellPass)) }))
    .filter((f) => f.tiles.length > 0);
  const noResults = visRacks.length === 0 && visFloors.length === 0;

  return (
    <div
      className="min-h-full text-[#1f2a35]"
      style={{ background: "linear-gradient(180deg,#e9f3fb 0%,#eff6fc 45%,#f4f8fd 100%)" }}
    >
      {/* Sticky in-page header */}
      <div className="sticky top-0 z-20 flex flex-col gap-3.5 border-b border-[#d6e3ef] bg-white/95 px-6 py-3.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-[18px]"
              style={{ background: "linear-gradient(135deg,#2f86cf,#7cc0ec)" }}
            >
              ☁️
            </span>
            <div>
              <div className="text-[16px] font-bold leading-none">คลังสินค้า · Map Location</div>
              <div className="mt-1 text-[11.5px] text-[#7a889a]">เห็นของ · Lot · ขนาดพาเลท · ว่างตรงไหน</div>
            </div>
          </div>
          <div className="relative ml-auto min-w-[200px] max-w-[420px] flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา สินค้า / Lot / ช่อง (เช่น PACA01, A37)"
              className="w-full rounded-[10px] border-[1.5px] border-[#d8e2ee] bg-[#f4f8fc] px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#2f86cf]"
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="flex flex-wrap items-stretch gap-2.5">
          <div className="min-w-[160px] flex-1 rounded-[12px] border border-[#e5edf3] bg-[#f4f8fc] px-4 py-2.5">
            <div className="text-[11.5px] font-medium text-[#7a8798]">การใช้งานคลังรวม (ตร.ม.)</div>
            <div className="my-0.5 flex items-baseline gap-1.5">
              <span className="font-num text-[22px] font-bold">{summary.utilPct}%</span>
              <span className="font-num text-[11.5px] text-[#7a8798]">
                {summary.areaUsed.toLocaleString()} / {summary.areaCap.toLocaleString()} ตร.ม. · {summary.pallets.toLocaleString()} พาเลท
              </span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-[20px] bg-[#dfe7f0]">
              <div className="h-full rounded-[20px]" style={{ width: `${summary.utilPct}%`, background: ACCENT }} />
            </div>
          </div>
          <StatCard dot={STATUS.free.color} label="ว่างทั้งช่อง" value={summary.free} />
          <StatCard dot={STATUS.partial.color} label="มีบางส่วน" value={summary.partial} />
          <StatCard dot={STATUS.full.color} label="เต็ม" value={summary.full} />
          <StatCard dot={ACCENT} label="ช่องทั้งหมด" value={summary.positions} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[11.5px] font-semibold text-[#7a8798]">สถานะ</span>
            <Chip active={status === "all"} onClick={() => setStatus("all")} label="ทั้งหมด" />
            <Chip active={status === "free"} onClick={() => setStatus("free")} label="ว่าง" tone={STATUS.free.color} />
            <Chip active={status === "partial"} onClick={() => setStatus("partial")} label="มีบางส่วน" tone={STATUS.partial.color} />
            <Chip active={status === "full"} onClick={() => setStatus("full")} label="เต็ม" tone={STATUS.full.color} />
          </div>
          <div className="h-[22px] w-px bg-[#dfe7f0]" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[11.5px] font-semibold text-[#7a8798]">โซน</span>
            <Chip active={zone === "all"} onClick={() => setZone("all")} label="ทั้งหมด" />
            {zones.map((z) => (
              <Chip key={z} active={zone === z} onClick={() => setZone(z)} label={z} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setArrangeMode((v) => !v); setSwapMode(false); setSwapSrc(null); setSelId(null); }}
              className="rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold transition"
              style={{
                borderColor: arrangeMode ? "#2f6f3e" : "#e4e7f1",
                background: arrangeMode ? "#2f6f3e" : "#fff",
                color: arrangeMode ? "#fff" : "#4f5a68",
              }}
            >
              ⠿ {arrangeMode ? "โหมดจัดผัง: เปิด" : "จัดผัง (ลากสลับที่)"}
            </button>
            <button
              onClick={() => { setSwapMode((v) => !v); setArrangeMode(false); setSwapSrc(null); }}
              className="rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold transition"
              style={{
                borderColor: swapMode ? "#22415e" : "#e4e7f1",
                background: swapMode ? "#22415e" : "#fff",
                color: swapMode ? "#fff" : "#4f5a68",
              }}
            >
              ↔ {swapMode ? "โหมดสลับ: เปิด" : "สลับของ"}
            </button>
          </div>
        </div>
        {arrangeMode && (
          <div className="flex items-center gap-2 rounded-[10px] bg-[#2f6f3e] px-4 py-2 text-[12.5px] text-white">
            <span className="text-[14px]">⠿</span>
            จัดผังให้ตรงกับคลังจริง — <b className="mx-1">ลากช่อง (หรือแถว rack) ไปวางตำแหน่งที่ต้องการ</b>
            การจัดผังนี้เปลี่ยนแค่การแสดงผล ไม่ได้ย้ายของจริง
            <button
              onClick={() => setArrangeMode(false)}
              className="ml-auto rounded-[7px] bg-[#255831] px-2.5 py-1 text-[12px] text-[#d6ecdb]"
            >
              ปิดโหมด
            </button>
          </div>
        )}
        {swapMode && (
          <div className="flex items-center gap-2 rounded-[10px] bg-[#22415e] px-4 py-2 text-[12.5px] text-white">
            <span className="h-2 w-2 rounded-full bg-[#5ca8e0]" />
            {swapSrc ? (
              <>คลิกช่องที่ 2 เพื่อสลับกับ <b className="mx-1">{swapSrc}</b> — หรือคลิก {swapSrc} อีกครั้งเพื่อยกเลิก</>
            ) : (
              <>โหมดสลับตำแหน่ง — คลิกช่องแรก แล้วคลิกช่องที่สอง (สลับของทั้ง 2 ช่อง)</>
            )}
            <button
              onClick={() => { setSwapMode(false); setSwapSrc(null); }}
              className="ml-auto rounded-[7px] bg-[#2f4e64] px-2.5 py-1 text-[12px] text-[#cfd4e6]"
            >
              ปิดโหมด
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 px-6 pb-16 pt-5">
        <div className="flex flex-wrap items-center gap-4 text-[12px]">
          <span className="font-semibold text-[#7a8798]">
            แต่ละจุด = 1 พาเลท · สีบอกสินค้า (สินค้าเดียวกัน = สีเดียวกัน) · ว่าง = สีจาง
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => setShowLegend((v) => !v)}
              className="rounded-full border border-[#cdd6e2] px-3 py-1 text-[11.5px] font-medium text-[#4f5a68] hover:border-[#2f86cf]"
            >
              {showLegend ? "ซ่อนสีสินค้า" : `สีสินค้า (${productList.length})`}
            </button>
          </div>
        </div>
        {showLegend && (
          <div className="flex max-h-[168px] flex-wrap gap-x-4 gap-y-1.5 overflow-y-auto rounded-[12px] border border-[#e5edf3] bg-white p-3">
            {productList.length === 0 ? (
              <span className="text-[12px] text-[#939db0]">ยังไม่มีสินค้าในคลัง</span>
            ) : (
              productList.map((p) => (
                <span key={p.code} className="flex items-center gap-1.5 text-[11.5px] text-[#4f5a68]" title={p.name}>
                  <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: p.color }} />
                  <span className="font-num text-[#7a8798]">{p.code}</span>
                  <span className="max-w-[150px] truncate">{p.name}</span>
                </span>
              ))
            )}
          </div>
        )}

        {/* RACK ZONES */}
        {visRacks.map((r) => (
          <section key={r.zone} className="rounded-[16px] border border-[#e5edf3] bg-white p-[18px_20px] shadow-[0_1px_3px_rgba(30,36,51,.04)]">
            <ZoneHeader tag={r.zone} title={`Rack ${r.zone}`} sub={`${r.bays.length} ช่อง (bay) · 3 ชั้น`} used={r.used} cap={r.cap} />
            <div className="overflow-x-auto pb-1">
              <div className="flex items-start gap-2">
                <div className="flex flex-none flex-col gap-1.5">
                  {["L3", "L2", "L1"].map((lv) => (
                    <div key={lv} className="flex h-[56px] items-center text-[10.5px] font-semibold text-[#a2a9bd]">
                      {lv}
                    </div>
                  ))}
                  <div className="h-[22px]" />
                </div>
                {r.bays.map((bay) => {
                  const zoneId = `rack:${r.zone}`;
                  const dragging = arrangeMode && dragKey === bay.bayCode && dragZoneId === zoneId;
                  return (
                    <div
                      key={bay.bayCode}
                      draggable={arrangeMode}
                      onDragStart={() => { setDragKey(bay.bayCode); setDragZoneId(zoneId); }}
                      onDragOver={(e) => { if (arrangeMode && dragZoneId === zoneId) e.preventDefault(); }}
                      onDrop={() => handleDrop(zoneId, bay.bayCode)}
                      className="flex flex-none flex-col gap-1.5 rounded-[10px]"
                      style={{
                        cursor: arrangeMode ? "grab" : undefined,
                        opacity: dragging ? 0.4 : 1,
                        boxShadow: arrangeMode ? "0 0 0 1.5px #bcdcc6" : undefined,
                        padding: arrangeMode ? 4 : 0,
                      }}
                    >
                      {bay.levels.map((c) => (
                        <RackCell key={c.id} cell={c} productColor={productColor} swapSel={swapSrc === c.id} onClick={() => handleTileClick(c.id)} />
                      ))}
                      <div className="flex h-[22px] items-center justify-center text-[10px] font-bold text-[#4f5a68]">
                        {arrangeMode && <span className="mr-1 text-[#6aa678]">⠿</span>}
                        {bay.bayCode}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        {/* FLOOR ZONES */}
        {visFloors.map((f) => (
          <section key={f.zone} className="rounded-[16px] border border-[#e5edf3] bg-white p-[18px_20px] shadow-[0_1px_3px_rgba(30,36,51,.04)]">
            <ZoneHeader tag={f.zone} title={`พื้นวางซ้อน · โซน ${f.zone}`} sub={`${f.tiles.length} บล็อก`} used={f.used} cap={f.cap} />
            <div className="mb-2 text-[10.5px] text-[#a6b0bd]">
              แต่ละแท่ง = 1 แถว · แถว = จุดวางบนพื้น · คอลัมน์ = ชั้นซ้อน (1→บนสุด) · สียิ่งเข้ม = ชั้นสูงขึ้น
            </div>
            <div
              className="grid items-start gap-2 overflow-x-auto pb-1"
              style={{ gridTemplateColumns: "repeat(30, minmax(34px, 1fr))" }}
            >
              {f.tiles.map((c) => {
                const zoneId = `floor:${f.zone}`;
                return (
                  <FloorTile
                    key={c.id}
                    cell={c}
                    productColor={productColor}
                    swapSel={swapSrc === c.id}
                    onClick={() => handleTileClick(c.id)}
                    arrange={arrangeMode}
                    dragging={arrangeMode && dragKey === c.code && dragZoneId === zoneId}
                    onDragStart={() => { setDragKey(c.code); setDragZoneId(zoneId); }}
                    onDragOver={(e) => { if (arrangeMode && dragZoneId === zoneId) e.preventDefault(); }}
                    onDrop={() => handleDrop(zoneId, c.code)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {noResults && (
          <div className="py-[50px] text-center text-[#939db0]">
            <div className="mb-1 text-[15px] font-semibold">ไม่พบช่องที่ตรงกับเงื่อนไข</div>
            <div className="text-[13px]">ลองล้างตัวกรองหรือคำค้นหา</div>
          </div>
        )}
      </div>

      {selCell && (
        <Drawer cell={selCell} locationCodes={locationCodes} productColor={productColor} onClose={() => setSelId(null)} />
      )}
    </div>
  );
}

function StatCard({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="min-w-[128px] flex-1 rounded-[12px] border border-[#e5edf3] bg-[#f4f8fc] px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-[12px] font-medium text-[#4f5a68]">{label}</span>
      </div>
      <div className="font-num mt-0.5 text-[22px] font-bold">{value}</div>
    </div>
  );
}

function Chip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold transition"
      style={{
        borderColor: active ? ACCENT : "#e4e7f1",
        background: active ? "#e6f4ec" : "#fff",
        color: active ? ACCENT : "#4f5a68",
      }}
    >
      {tone && <span className="h-2 w-2 rounded-full" style={{ background: tone }} />}
      {label}
    </button>
  );
}

function ZoneHeader({ tag, title, sub, used, cap }: { tag: string; title: string; sub: string; used: number; cap: number }) {
  const p = pct(used, cap);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-[46px] items-center justify-center rounded-[11px] bg-[#e6f4ec] text-[13px] font-bold text-[#2f86cf]">
          {tag}
        </div>
        <div>
          <div className="text-[15px] font-bold">{title}</div>
          <div className="text-[11.5px] text-[#7a8798]">{sub}</div>
        </div>
      </div>
      <div className="ml-auto flex min-w-[180px] items-center gap-2">
        <div className="h-[7px] flex-1 overflow-hidden rounded-[20px] bg-[#e9f1ea]">
          <div className="h-full rounded-[20px]" style={{ width: `${p}%`, background: p >= 100 ? STATUS.full.color : ACCENT }} />
        </div>
        <span className="font-num whitespace-nowrap text-[12px] font-semibold text-[#4f5a68]">
          {used}/{cap} · {p}%
        </span>
      </div>
    </div>
  );
}

function Dots({ used, cap, color }: { used: number; cap: number; color: string }) {
  const max = Math.min(cap, 24);
  return (
    <div className="my-0.5 flex max-w-[54px] flex-wrap justify-center gap-[2.5px]">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="h-[5px] w-[5px] rounded-full"
          style={{ background: i < used ? color : "#dfe3ef" }}
        />
      ))}
    </div>
  );
}

function RackCell({
  cell,
  onClick,
  swapSel,
  productColor,
}: {
  cell: MapCell;
  onClick: () => void;
  swapSel?: boolean;
  productColor: (code: string) => string;
}) {
  const s = STATUS[cell.status];
  const domColor = cell.lots[0] ? productColor(cell.lots[0].productCode) : s.color;
  return (
    <button
      onClick={onClick}
      title={`${cell.code} · ${cell.pallets}/${cell.capacity} พาเลท${cell.topLot ? ` · ${cell.topLot}` : ""}`}
      className="flex h-[56px] w-[62px] flex-col items-center justify-center rounded-[9px] border transition hover:brightness-95"
      style={{ background: s.bg, borderColor: swapSel ? "#22415e" : s.border, boxShadow: swapSel ? "0 0 0 2px #22415e" : undefined }}
    >
      <span className="rounded-[4px] px-1 text-[8.5px] font-bold" style={{ background: s.color, color: "#fff" }}>
        L{cell.level}
      </span>
      <Dots used={cell.pallets} cap={cell.capacity} color={domColor} />
      <span className="font-num text-[9px] font-bold" style={{ color: s.color }}>
        {cell.pallets}/{cell.capacity}
      </span>
    </button>
  );
}


function FloorTile({
  cell,
  onClick,
  swapSel,
  productColor,
  arrange,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  cell: MapCell;
  onClick: () => void;
  swapSel?: boolean;
  productColor: (code: string) => string;
  arrange?: boolean;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const s = STATUS[cell.status];
  const c = containerDef(cell.containerType);
  // Grid = ground positions used (rows) × stack levels (cols). Pallets fill the
  // bottom level across the spots first, then stack up — so the filled columns
  // to the right mean pallets are stacked higher there.
  const S = Math.max(1, Math.min(cell.stack, 5));
  const groundUsed = cell.pallets > 0 ? Math.ceil(cell.pallets / S) : 0;
  // pallet index → product colour (so you can see products before opening it)
  const lotOfPallet: number[] = [];
  cell.lots.forEach((lot, li) => {
    for (let k = 0; k < lot.pallets; k++) lotOfPallet.push(li);
  });
  return (
    <button
      onClick={onClick}
      draggable={arrange}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={`${cell.code} · ${cell.pallets}/${cell.capacity} พาเลท · ซ้อนได้ ${cell.stack} ชั้น · ${cell.pallets > 0 ? c.en : "ว่าง"}`}
      className="flex h-[150px] w-full min-w-0 flex-col items-center gap-1 overflow-hidden rounded-[10px] border p-1.5 pt-2 transition hover:brightness-[.98]"
      style={{
        background: s.bg,
        borderColor: swapSel ? "#22415e" : arrange ? "#bcdcc6" : s.border,
        boxShadow: swapSel ? "0 0 0 2px #22415e" : arrange ? "0 0 0 1.5px #bcdcc6" : undefined,
        cursor: arrange ? "grab" : undefined,
        opacity: dragging ? 0.4 : 1,
      }}
    >
      <span className="font-num whitespace-nowrap text-[11px] font-bold leading-none" style={{ color: s.color }}>
        {cell.code}
      </span>
      <span
        className="max-w-full whitespace-nowrap rounded-[4px] px-1 py-0.5 text-center text-[9px] font-bold leading-none text-white"
        style={{ background: cell.pallets > 0 ? c.color : "#a6b0bd" }}
        title={cell.pallets > 0 ? c.en : "ว่าง"}
      >
        {cell.pallets > 0 ? c.abbr : "ว่าง"}
      </span>
      {S > 1 && cell.pallets > 0 && (
        <div className="flex gap-[3px] text-[7px] font-bold leading-none text-[#939db0]">
          {Array.from({ length: S }).map((_, c2) => (
            <span key={c2} className="w-[9px] text-center">
              {c2 + 1}
            </span>
          ))}
        </div>
      )}
      {/* One small cell per pallet (col = stack level). The area is a fixed slot
          so every tile is the same size; extra rows scroll out of view. */}
      <div className="flex w-full flex-1 flex-col items-center gap-[3px] overflow-hidden py-0.5">
        {Array.from({ length: cell.pallets > 0 ? groundUsed : 3 }).map((_, r) => (
          <div key={r} className="flex gap-[3px]">
            {Array.from({ length: cell.pallets > 0 ? S : 1 }).map((_, col) => {
              const idx = col * groundUsed + r;
              const filled = cell.pallets > 0 && idx < cell.pallets;
              const lot = filled ? cell.lots[lotOfPallet[idx]] : null;
              return (
                <span
                  key={col}
                  title={lot ? (lot.isExtra ? `${lot.name} (ของอื่น ๆ)` : `${lot.name} · Lot ${lot.lotNo}`) : undefined}
                  className="h-[6px] w-[9px] rounded-[2px]"
                  style={{ background: lot ? (lot.isExtra ? "#8a6d5a" : productColor(lot.productCode)) : "#e0e4ee" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="font-num whitespace-nowrap text-[9.5px] font-bold leading-none" style={{ color: s.color }}>
        {cell.pallets}/{cell.capacity}
      </span>
      {cell.stack > 1 && (
        <span className="whitespace-nowrap rounded-[4px] bg-white/70 px-1 text-[8px] font-bold text-[#4f5a68]">
          ซ้อน {cell.stack}ช
        </span>
      )}
    </button>
  );
}

function StackMap({ cell, productColor }: { cell: MapCell; productColor: (code: string) => string }) {
  const router = useRouter();
  const S = Math.max(1, cell.stack);
  const P = cell.pallets;
  const groundSpots = Math.max(1, Math.ceil(P / S));

  // Local (optimistic) arrangement; re-seed when the bin or its pallet count changes.
  const [slots, setSlots] = useState<SlotEntry[]>(cell.slotMap ?? []);
  const [dragRC, setDragRC] = useState<{ r: number; c: number } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setSlots(cell.slotMap ?? []);
    setDragRC(null);
  }, [cell.code, P, S]);

  const lotIndex = useMemo(() => {
    const m = new Map<string, number>();
    cell.lots.forEach((l, i) => m.set(l.id, i));
    return m;
  }, [cell.lots]);

  // Reconcile the saved arrangement against the pallets actually in the bin:
  // honour saved slots that still have a matching pallet, then auto-fill the
  // rest into the remaining cells (bottom level first, then stacking up).
  const grid = useMemo(() => {
    const pool = new Map<string, number>();
    cell.lots.forEach((l) => pool.set(l.id, (pool.get(l.id) ?? 0) + l.pallets));
    const g: (string | null)[][] = Array.from({ length: groundSpots }, () => Array(S).fill(null));
    const taken = new Set<string>();
    for (const sl of slots) {
      if (sl.s < 0 || sl.s >= groundSpots || sl.l < 0 || sl.l >= S) continue;
      if (taken.has(`${sl.s},${sl.l}`)) continue;
      if ((pool.get(sl.lot) ?? 0) <= 0) continue;
      g[sl.s][sl.l] = sl.lot;
      taken.add(`${sl.s},${sl.l}`);
      pool.set(sl.lot, (pool.get(sl.lot) ?? 0) - 1);
    }
    const remaining: string[] = [];
    for (const [lot, n] of pool) for (let k = 0; k < n; k++) remaining.push(lot);
    let ri = 0;
    for (let c = 0; c < S && ri < remaining.length; c++)
      for (let r = 0; r < groundSpots && ri < remaining.length; r++)
        if (g[r][c] === null) g[r][c] = remaining[ri++];
    return g;
  }, [cell.lots, slots, groundSpots, S]);

  function gridToSlots(g: (string | null)[][]): SlotEntry[] {
    const out: SlotEntry[] = [];
    for (let r = 0; r < g.length; r++)
      for (let c = 0; c < g[r].length; c++) if (g[r][c]) out.push({ s: r, l: c, lot: g[r][c]! });
    return out;
  }

  async function persist(next: SlotEntry[]) {
    setBusy(true);
    const res = await setBinSlotMapAction(cell.code, next);
    setBusy(false);
    if (res.error) showToast(res.error);
    else {
      showToast("บันทึกผังการวางแล้ว");
      router.refresh();
    }
  }

  function onDropCell(r2: number, c2: number) {
    const from = dragRC;
    setDragRC(null);
    if (!from || (from.r === r2 && from.c === c2)) return;
    const g = grid.map((row) => row.slice());
    const tmp = g[r2][c2];
    g[r2][c2] = g[from.r][from.c];
    g[from.r][from.c] = tmp; // swap (move if the target was empty)
    const next = gridToSlots(g);
    setSlots(next);
    persist(next);
  }

  const extraLots = useMemo(() => cell.lots.filter((l) => l.isExtra), [cell.lots]);
  const cellInfo = (lotId: string | null) => {
    if (!lotId) return null;
    const i = lotIndex.get(lotId);
    if (i == null) return null;
    const lot = cell.lots[i];
    if (lot.isExtra) {
      const ei = extraLots.findIndex((l) => l.id === lotId);
      return { num: `R${ei + 1}`, color: extraColor(ei), title: `${lot.name} (ของอื่น ๆ)`, isExtra: true };
    }
    return { num: `${i + 1}`, color: productColor(lot.productCode), title: `${lot.name} · Lot ${lot.lotNo}`, isExtra: false };
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] font-bold text-[#7a8798]">
          ผังการวางซ้อน {S > 1 ? `(ซ้อนได้ ${S} ชั้น)` : ""}
        </span>
        <span className="font-num text-[11px] text-[#a6b0bd]">แต่ละจุด = 1 พาเลท · สีบอกสินค้า</span>
      </div>
      {P > 0 && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-[8px] bg-[#eef7f1] px-2.5 py-1 text-[11px] text-[#2f7d4e]">
          <span>⠿</span> ลากพาเลทไปวางจุด/ชั้นที่ต้องการ ให้ตรงกับของจริง · บันทึกอัตโนมัติ
        </div>
      )}
      {/* Vertical layout: each ground spot is a row going down; stack levels
          sit side by side within the row. Drag a pallet to another cell. */}
      <div className="rounded-[12px] border border-[#e6eef5] bg-[#f7fbff] p-3">
        {S > 1 && (
          <div className="mb-1 flex gap-[4px] pl-[54px] text-[9px] font-bold text-[#939db0]">
            {Array.from({ length: S }).map((_, c) => (
              <span key={c} className="w-[26px] text-center">
                ช{c + 1}
              </span>
            ))}
          </div>
        )}
        <div className="flex max-h-[300px] flex-col gap-[5px] overflow-y-auto">
          {grid.map((row, r) => (
            <div key={r} className="flex items-center gap-[4px]">
              <span className="w-[50px] flex-none text-[10px] font-medium text-[#a6b0bd]">จุด {r + 1}</span>
              {row.map((lotId, c) => {
                const info = cellInfo(lotId);
                const isDragging = dragRC?.r === r && dragRC?.c === c;
                return (
                  <span
                    key={c}
                    draggable={!!info && !busy}
                    onDragStart={() => info && setDragRC({ r, c })}
                    onDragOver={(e) => { if (dragRC) e.preventDefault(); }}
                    onDrop={() => onDropCell(r, c)}
                    title={info?.title ?? "ว่าง — ลากพาเลทมาวางได้"}
                    className="flex h-[24px] w-[26px] items-center justify-center rounded-[4px] text-[9px] font-bold text-white transition"
                    style={{
                      background: info ? info.color : "#e2e8f2",
                      cursor: info ? "grab" : "default",
                      opacity: isDragging ? 0.4 : 1,
                      outline: isDragging ? "2px solid #2f6f3e" : undefined,
                    }}
                  >
                    {info ? info.num : ""}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {S > 1 && (
        <div className="font-num mt-1.5 text-[11.5px] text-[#7a8798]">
          วาง {P} พาเลท บน {groundSpots} จุด · ซ้อนสูงสุด {S} ชั้น
        </div>
      )}
    </div>
  );
}

function Drawer({
  cell,
  locationCodes,
  productColor,
  onClose,
}: {
  cell: MapCell;
  locationCodes: string[];
  productColor: (code: string) => string;
  onClose: () => void;
}) {
  const router = useRouter();
  const s = STATUS[cell.status];
  const p = pct(cell.areaUsed, cell.areaCap);
  const [moveLotId, setMoveLotId] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [swapTo, setSwapTo] = useState("");
  const [busy, setBusy] = useState(false);

  // Real product lots vs. non-stock "extra" items (Reuse, empty pallets…)
  const realLots = cell.lots.filter((l) => !l.isExtra);
  const extraLots = cell.lots.filter((l) => l.isExtra);
  const [newExtraLabel, setNewExtraLabel] = useState("");
  const [newExtraQty, setNewExtraQty] = useState("1");

  function currentExtras() {
    return extraLots.map((l) => ({
      id: l.id.replace(/^extra:/, ""),
      label: l.name,
      pallets: l.pallets,
    }));
  }

  async function saveExtras(next: { id: string; label: string; pallets: number }[]) {
    setBusy(true);
    const res = await setBinExtrasAction(cell.code, next);
    setBusy(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    router.refresh();
  }

  async function addExtra() {
    const label = newExtraLabel.trim();
    const qty = Math.max(1, Math.trunc(Number(newExtraQty) || 1));
    if (!label || busy) return;
    const id = `x${Date.now().toString(36)}`;
    await saveExtras([...currentExtras(), { id, label, pallets: qty }]);
    setNewExtraLabel("");
    setNewExtraQty("1");
    showToast(`เพิ่ม “${label}” แล้ว`);
  }

  async function removeExtra(rawId: string) {
    if (busy) return;
    await saveExtras(currentExtras().filter((e) => e.id !== rawId));
    showToast("ลบของอื่น ๆ แล้ว");
  }

  async function setStack(n: number) {
    if (busy) return;
    setBusy(true);
    const res = await setBinStackAction(cell.code, n);
    setBusy(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast(`ตั้งซ้อนจริง ${n} ชั้นแล้ว`);
    router.refresh();
  }

  async function doMove(lot: MapLot) {
    if (!moveTo.trim() || busy) return;
    setBusy(true);
    const res = await moveLotAction(lot.id, moveTo);
    setBusy(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast(`ย้าย ${lot.name} → ${moveTo.trim()} แล้ว`);
    setMoveLotId(null);
    setMoveTo("");
    router.refresh();
  }

  async function doSwap() {
    if (!swapTo.trim() || busy) return;
    setBusy(true);
    const res = await swapLocationsAction(cell.code, swapTo);
    setBusy(false);
    if (res.error) {
      showToast(res.error);
      return;
    }
    showToast(`สลับ ${cell.code} ↔ ${swapTo.trim()} แล้ว`);
    setSwapTo("");
    router.refresh();
  }

  return (
    <div>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-[rgba(20,25,40,.28)]" />
      <aside className="fixed bottom-0 right-0 top-0 z-[41] flex w-[414px] max-w-[94vw] flex-col bg-white shadow-[-8px_0_30px_rgba(20,25,40,.14)]">
        <div className="flex items-start gap-3 border-b border-[#e5edf3] px-[22px] py-[18px]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-num text-[22px] font-bold tracking-[.3px]">{cell.code}</span>
              <span
                className="rounded-[6px] px-2 py-0.5 text-[11px] font-bold"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
              >
                {s.label}
              </span>
            </div>
            <div className="mt-1 text-[12.5px] text-[#7a8798]">
              โซน {cell.zone} · {cell.kind === "rack" ? `Rack ชั้น L${cell.level}` : "พื้นวางซ้อน"} · {cell.width}×{cell.length} ม.
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto h-[30px] w-[30px] rounded-[8px] bg-[#f2f4fa] text-[16px] text-[#6a7189] hover:bg-[#dfe7f0]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[15px] overflow-y-auto px-[22px] py-4">
          {/* capacity */}
          <div className="rounded-[14px] border border-[#e6eef5] bg-[#f4f8fc] px-[15px] py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#7a8798]">ความจุ (คิดจากพื้นที่)</span>
              <span className="font-num text-[12px] font-semibold text-[#4f5a68]">
                ว่างอีก {Math.max(0, Math.round((cell.areaCap - cell.areaUsed) * 10) / 10)} ตร.ม.
              </span>
            </div>
            <div className="mb-2 h-[8px] overflow-hidden rounded-[20px] bg-[#dfe7f0]">
              <div className="h-full rounded-[20px]" style={{ width: `${p}%`, background: p >= 100 ? STATUS.full.color : ACCENT }} />
            </div>
            <div className="text-[13px] text-[#4f5a68]">
              <b className="font-num text-[18px] text-[#1f2a35]">{cell.areaUsed}</b> / {cell.areaCap} ตร.ม. ({p}%)
            </div>
            <div className="font-num mt-1 text-[12px] text-[#7a8798]">
              วางแล้ว {cell.pallets} พาเลท · ยังใส่ได้อีก ~{Math.max(0, cell.capacity - cell.pallets)} พาเลท (ตามขนาดที่วางอยู่)
            </div>
          </div>

          {/* actual stack height (some bins can stack 3 but aren't stacked 3) */}
          {cell.stackMax > 1 && (
            <div className="rounded-[12px] border border-[#e6eef5] bg-[#f7fbff] px-[13px] py-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#7a8798]">ซ้อนจริงในช่องนี้</span>
                <span className="text-[11px] text-[#a6b0bd]">ซ้อนได้สูงสุด {cell.stackMax} ชั้น</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from({ length: cell.stackMax }).map((_, i) => {
                  const n = i + 1;
                  const active = cell.stack === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setStack(n)}
                      disabled={busy}
                      className="rounded-[8px] border px-3 py-1 text-[12.5px] font-semibold transition disabled:opacity-50"
                      style={{
                        borderColor: active ? ACCENT : "#dbe4ee",
                        background: active ? "#e6f0fb" : "#fff",
                        color: active ? ACCENT : "#64708a",
                      }}
                    >
                      {n} ชั้น
                    </button>
                  );
                })}
                <span className="ml-1 text-[11px] text-[#a6b0bd]">
                  เลือกจำนวนชั้นที่วางซ้อนจริง แล้วผังจะกระจายพาเลทตามนั้น
                </span>
              </div>
            </div>
          )}

          {/* position map — coloured by product so you can see what each pallet is */}
          <StackMap cell={cell} productColor={productColor} />
          <datalist id="allLocs">
            {locationCodes.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>

          {/* lots */}
          <div>
            <div className="mb-2 text-[12px] font-bold text-[#7a8798]">ลอตที่จัดเก็บ ({realLots.length})</div>
            {realLots.length === 0 ? (
              <div className="rounded-[12px] border-[1.5px] border-dashed border-[#dfe3ef] p-4 text-center text-[13px] text-[#939db0]">
                ไม่มีสินค้าในระบบในช่องนี้ — รับเข้า/ย้ายของมาที่ช่องนี้ได้ที่หน้า Receive / Transfer
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {realLots.map((lot, i) => {
                  const c = containerDef(lot.containerType);
                  return (
                    <div key={i} className="rounded-[12px] border border-[#e5edf3] p-[11px_13px]">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-[5px] text-[9px] font-bold text-white"
                          style={{ background: productColor(lot.productCode) }}
                          title="เลข/สีของสินค้านี้ในผังด้านบน"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold">{lot.name}</div>
                          <div className="font-num text-[11.5px] text-[#7a8798]">{lot.productCode}</div>
                        </div>
                        <span className="rounded-[5px] px-1.5 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: c.color }}>
                          {c.en}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12px] text-[#4f5a68]">
                        <span>
                          Lot: <b className="font-num">{lot.lotNo}</b>
                        </span>
                        <span className="font-num">{lot.pallets} พาเลท</span>
                        <span className="font-num">
                          {lot.qty.toLocaleString()} {lot.unit}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-[#7a8798]">
                        <span>เข้า {lot.inDate}</span>
                        {lot.expDate && (
                          <span style={{ color: lot.expired ? "#c0453f" : undefined }}>หมดอายุ {lot.expDate}</span>
                        )}
                        {lot.status === "QC" && <span className="font-semibold text-[#b5790f]">ติด QC</span>}
                      </div>
                      {moveLotId === lot.id ? (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <input
                            value={moveTo}
                            onChange={(e) => setMoveTo(e.target.value)}
                            list="allLocs"
                            placeholder="พิมพ์ช่องปลายทาง เช่น A44"
                            className="min-w-0 flex-1 rounded-[8px] border border-[#cdd6e2] px-2 py-1.5 font-num text-[12.5px] outline-none focus:border-[#2f86cf]"
                          />
                          <button
                            onClick={() => doMove(lot)}
                            disabled={busy || !moveTo.trim()}
                            className="flex-none rounded-[8px] bg-[#2f86cf] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            ย้าย
                          </button>
                          <button
                            onClick={() => { setMoveLotId(null); setMoveTo(""); }}
                            className="flex-none rounded-[8px] border border-[#d8e2ee] px-2 py-1.5 text-[12px] text-[#64708a]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setMoveLotId(lot.id); setMoveTo(""); }}
                          className="mt-2.5 w-full rounded-[8px] border border-[#d8e2ee] py-1.5 text-[12px] font-semibold text-[#2f86cf] hover:bg-[#f5f6ff]"
                        >
                          ↔ ย้ายลอตนี้ไปช่องอื่น
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* non-stock items placed here (Reuse material, empty pallets…) */}
          <div className="rounded-[12px] border border-[#e7e0d6] bg-[#faf7f2] p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[13px]">♻️</span>
              <span className="text-[12px] font-bold text-[#7a6a55]">
                ของอื่น ๆ ในช่องนี้ ({extraLots.length})
              </span>
              <span className="text-[10.5px] text-[#a99a86]">ไม่ใช่สินค้าในระบบ · เช่น Reuse, พาเลทเปล่า</span>
            </div>
            {extraLots.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {extraLots.map((lot, i) => (
                  <div
                    key={lot.id}
                    className="flex items-center gap-2 rounded-[9px] border border-[#ece3d6] bg-white px-2.5 py-1.5"
                  >
                    <span
                      className="flex h-4 w-4 flex-none items-center justify-center rounded-[5px] text-[8.5px] font-bold text-white"
                      style={{ background: extraColor(i) }}
                    >
                      R{i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#5f5340]">
                      {lot.name}
                    </span>
                    <span className="font-num flex-none text-[11.5px] text-[#a2937d]">
                      {lot.pallets} พาเลท
                    </span>
                    <button
                      onClick={() => removeExtra(lot.id.replace(/^extra:/, ""))}
                      disabled={busy}
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
                value={newExtraLabel}
                onChange={(e) => setNewExtraLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addExtra(); }}
                placeholder="ชื่อของ เช่น Reuse / พาเลทเปล่า / อุปกรณ์"
                className="min-w-0 flex-1 rounded-[8px] border border-[#dccfbd] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-[#b79a72]"
              />
              <input
                value={newExtraQty}
                onChange={(e) => setNewExtraQty(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                title="จำนวนพาเลท/จุดที่วาง"
                className="font-num w-[52px] flex-none rounded-[8px] border border-[#dccfbd] bg-white px-2 py-1.5 text-center text-[12.5px] outline-none focus:border-[#b79a72]"
              />
              <button
                onClick={addExtra}
                disabled={busy || !newExtraLabel.trim()}
                className="flex-none rounded-[8px] bg-[#9a7b52] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#846943] disabled:opacity-50"
              >
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* swap this bin with another */}
          {realLots.length > 0 && (
            <div className="rounded-[12px] border border-dashed border-[#cfd6ea] bg-[#f7fbff] p-3">
              <div className="mb-2 text-[12px] font-bold text-[#7a8798]">สลับของทั้งช่องกับอีกช่อง</div>
              <div className="flex items-center gap-1.5">
                <input
                  value={swapTo}
                  onChange={(e) => setSwapTo(e.target.value)}
                  list="allLocs"
                  placeholder={`สลับ ${cell.code} ↔ ช่อง…`}
                  className="min-w-0 flex-1 rounded-[8px] border border-[#cdd6e2] px-2 py-1.5 font-num text-[12.5px] outline-none focus:border-[#2f86cf]"
                />
                <button
                  onClick={doSwap}
                  disabled={busy || !swapTo.trim()}
                  className="flex-none rounded-[8px] bg-[#22415e] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  สลับ
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
