import "server-only";
import { db } from "@/lib/db";
import { productLabel } from "@/lib/calc/productName";
import { todayBangkok, fmtDateBE } from "@/lib/calc/date";
import { binCapacity, lotFloorArea } from "@/lib/calc/storage";

// Default pallet footprint in m² (EUR 0.8×1.2) — only used to estimate the
// pallet capacity of an EMPTY bin, where the pallet size is not yet known.
const DEFAULT_PALLET_M2 = 0.96;

export type MapLot = {
  id: string;
  productCode: string;
  name: string;
  lotNo: string;
  pallets: number;
  qty: number;
  unit: string;
  status: "OK" | "QC";
  expired: boolean;
  containerType: string;
  inDate: string;
  expDate: string | null;
  isExtra?: boolean; // non-stock item (Reuse, empty pallets…), not a real lot
};

export type ExtraItem = { id: string; label: string; pallets: number };

export type MapCell = {
  id: string; // location code (unique)
  code: string; // display code
  zone: string; // derived group: PACA / PACB / SEMA… / A / B
  kind: "rack" | "floor";
  bayCode: string; // rack: PACA01 ; floor: same as code
  level: number; // rack level (1..n); floor = 0
  width: number;
  length: number;
  mapOrder: number | null; // custom layout order (drag to arrange); null = auto
  areaCap: number; // bin floor area (m²)
  areaUsed: number; // area occupied by stored pallets (m²)
  capacity: number; // pallet capacity — depends on the pallet size stored
  pallets: number;
  stack: number; // actual pallets-high used in this bin (ซ้อนจริง 1-3)
  stackMax: number; // how high the product COULD stack (capability)
  status: "free" | "partial" | "full";
  containerType: string; // dominant
  topLot: string | null;
  lots: MapLot[];
  slotMap: SlotEntry[]; // saved pallet arrangement inside the bin
};

// One placed pallet in a bin's custom arrangement: spot (row) + level (col) + lot.
export type SlotEntry = { s: number; l: number; lot: string };

export type RackZone = {
  zone: string;
  kind: "rack";
  cap: number;
  used: number;
  bays: { bayCode: string; levels: MapCell[] }[]; // levels sorted high→low
};

export type FloorZone = {
  zone: string;
  kind: "floor";
  cap: number;
  used: number;
  tiles: MapCell[];
};

export type MapSummary = {
  positions: number;
  free: number;
  partial: number;
  full: number;
  pallets: number;
  areaUsed: number; // m²
  areaCap: number; // m²
  utilPct: number; // by area
};

const RACK_RE = /^(PAC[AB]|SEM[ABCD])[-_ ]*0*(\d+)[-_ ]*L0*(\d+)$/i;
const FLOOR_RE = /^([A-Z]+)[-_ ]*0*(\d+)$/;

function parseExtras(raw: unknown): ExtraItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtraItem[] = [];
  for (const e of raw) {
    if (e && typeof e === "object") {
      const label = typeof (e as ExtraItem).label === "string" ? (e as ExtraItem).label : "";
      const pallets = Number((e as ExtraItem).pallets);
      const id = typeof (e as ExtraItem).id === "string" ? (e as ExtraItem).id : "";
      if (label && id && Number.isFinite(pallets) && pallets > 0)
        out.push({ id, label, pallets: Math.max(1, Math.trunc(pallets)) });
    }
  }
  return out;
}

function parseSlotMap(raw: unknown): SlotEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SlotEntry[] = [];
  for (const e of raw) {
    if (
      e &&
      typeof e === "object" &&
      typeof (e as SlotEntry).s === "number" &&
      typeof (e as SlotEntry).l === "number" &&
      typeof (e as SlotEntry).lot === "string"
    ) {
      out.push({ s: (e as SlotEntry).s, l: (e as SlotEntry).l, lot: (e as SlotEntry).lot });
    }
  }
  return out;
}

function parseCode(
  code: string,
  fallbackZone: string
): { kind: "rack" | "floor"; zone: string; bayCode: string; level: number } {
  const c = code.trim().toUpperCase();
  const r = c.match(RACK_RE);
  if (r) {
    const zone = r[1];
    const bayNo = r[2].padStart(2, "0");
    return { kind: "rack", zone, bayCode: `${zone}${bayNo}`, level: parseInt(r[3], 10) };
  }
  const f = c.match(FLOOR_RE);
  if (f) {
    return { kind: "floor", zone: f[1], bayCode: c, level: 0 };
  }
  // Unknown code format — never drop it. Show it as a floor tile grouped under
  // its assigned zone (best-effort: leading letters, else the DB zone).
  const lead = c.match(/^[A-Z]+/);
  const zone = lead ? lead[0] : fallbackZone || "อื่นๆ";
  return { kind: "floor", zone, bayCode: c, level: 0 };
}

export async function getMapLocationData() {
  const [locations, lots] = await Promise.all([
    db.location.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    db.lot.findMany({ where: { qty: { gt: 0 } }, include: { product: true } }),
  ]);
  const today = todayBangkok();

  // per-lot floor-area inputs, so a bin's used area can be recomputed at the
  // bin's ACTUAL stack height (not just the product's max)
  type AreaInput = { qty: number; w: number; l: number; stack: number; pallet: number };
  const areaInputsByLoc = new Map<string, AreaInput[]>();
  const stackByLoc = new Map<string, number>(); // max pallets-high stored per location
  // The SAME lot (product + lot + status + expiry) can span several Lot rows in
  // one bin — e.g. production finished goods verified pallet-by-pallet at
  // different putaway times each create their own row. Merge them into one line
  // per bin (sum qty & pallets, keep the earliest putaway date) so the map shows
  // a lot once. Pallet/area totals are unchanged (still summed across raw rows).
  const lotGroupsByLoc = new Map<string, Map<string, MapLot & { _recvMs: number }>>();
  for (const l of lots) {
    const pallets = Math.max(1, Math.ceil(l.qty / Math.max(1, l.product.pallet)));
    const arrIn = areaInputsByLoc.get(l.locationCode) ?? [];
    arrIn.push({ qty: l.qty, w: l.product.width, l: l.product.length, stack: l.product.stackLevels, pallet: l.product.pallet });
    areaInputsByLoc.set(l.locationCode, arrIn);
    stackByLoc.set(l.locationCode, Math.max(stackByLoc.get(l.locationCode) ?? 1, l.product.stackLevels || 1));
    const expired = !!(l.expDate && l.expDate < today);
    const recvMs = l.recvDate.getTime();
    const key = `${l.product.code}||${l.lotNo}||${l.status}||${expired}`;
    const locMap = lotGroupsByLoc.get(l.locationCode) ?? new Map<string, MapLot & { _recvMs: number }>();
    const ex = locMap.get(key);
    if (ex) {
      ex.qty += l.qty;
      ex.pallets += pallets;
      if (recvMs < ex._recvMs) {
        ex._recvMs = recvMs;
        ex.inDate = fmtDateBE(l.recvDate);
      }
    } else {
      locMap.set(key, {
        id: l.id,
        productCode: l.product.code,
        name: productLabel(l.product.nameEn, l.product.nameTh),
        lotNo: l.lotNo,
        pallets,
        qty: l.qty,
        unit: l.product.unit,
        status: l.status,
        expired,
        containerType: l.product.containerType || "OTHER",
        inDate: fmtDateBE(l.recvDate),
        expDate: l.expDate ? fmtDateBE(l.expDate) : null,
        _recvMs: recvMs,
      });
    }
    lotGroupsByLoc.set(l.locationCode, locMap);
  }
  const lotsByLoc = new Map<string, MapLot[]>();
  for (const [loc, m] of lotGroupsByLoc) {
    lotsByLoc.set(
      loc,
      [...m.values()].map(({ _recvMs, ...rest }) => rest)
    );
  }

  const cells: MapCell[] = [];
  for (const loc of locations) {
    const parsed = parseCode(loc.code, loc.zone);
    const realLots = (lotsByLoc.get(loc.code) ?? []).sort((a, b) => b.pallets - a.pallets);
    // Non-stock items placed here (Reuse material, empty pallets…) become
    // pseudo-lots so they show on the map and occupy space, but are flagged.
    const extras: MapLot[] = parseExtras(loc.extraItems).map((e) => ({
      id: `extra:${e.id}`,
      productCode: "—",
      name: e.label,
      lotNo: "—",
      pallets: e.pallets,
      qty: e.pallets,
      unit: "พาเลท",
      status: "OK" as const,
      expired: false,
      containerType: "OTHER",
      inDate: "—",
      expDate: null,
      isExtra: true,
    }));
    const cellLots = [...realLots, ...extras];
    const pallets = cellLots.reduce((s, l) => s + l.pallets, 0);
    // Stacking: stackMax = how high the product COULD stack; actualStack =
    // what's really stacked in this bin (user override, ≤ max).
    const stackMax = Math.max(1, stackByLoc.get(loc.code) ?? 1);
    const actualStack =
      loc.stackUsed != null ? Math.min(stackMax, Math.max(1, loc.stackUsed)) : stackMax;
    // Measure by real floor area (m²), computed at the ACTUAL stack height —
    // stacking fewer levels than the max spreads the load over more floor.
    const areaCap = binCapacity(loc.width, loc.length);
    const realArea = (areaInputsByLoc.get(loc.code) ?? []).reduce(
      (s, li) => s + lotFloorArea(li.qty, li.w, li.l, Math.min(li.stack, actualStack), li.pallet),
      0
    );
    const extraArea = extras.reduce((s, e) => s + e.pallets, 0) * DEFAULT_PALLET_M2;
    const areaUsed = realArea + extraArea;
    // Pallet capacity, counted in whole floor SPOTS (not leftover area). A new
    // pallet needs a full floor footprint (footprint × stack), so a sliver of
    // free edge area must NOT read as "room for one more" — it only counts once
    // a whole spot fits. Empty slots on top of already-used spots do count.
    let capacity: number;
    if (pallets === 0) {
      capacity = Math.max(1, Math.floor(areaCap / DEFAULT_PALLET_M2));
    } else {
      const footPerPallet = areaUsed / pallets; // per pallet (already ÷ stack)
      const footPerSpot = footPerPallet * actualStack; // one full floor spot
      const usedSpots = Math.ceil(pallets / actualStack);
      const freeFloorArea = Math.max(0, areaCap - usedSpots * footPerSpot);
      const addSpots = footPerSpot > 0 ? Math.floor((freeFloorArea + 1e-6) / footPerSpot) : 0;
      const topFree = usedSpots * actualStack - pallets; // empty slots atop used spots
      capacity = Math.max(pallets, pallets + topFree + addSpots * actualStack);
    }
    // dominant container type = the one holding the most pallets
    const byType = new Map<string, number>();
    for (const l of cellLots) byType.set(l.containerType, (byType.get(l.containerType) ?? 0) + l.pallets);
    let dom = "OTHER";
    let best = -1;
    for (const [t, n] of byType) if (n > best) ((best = n), (dom = t));
    cells.push({
      id: loc.code,
      code: loc.code,
      zone: parsed.zone,
      kind: parsed.kind,
      bayCode: parsed.bayCode,
      level: parsed.level,
      width: loc.width,
      length: loc.length,
      mapOrder: loc.mapOrder ?? null,
      areaCap: Math.round(areaCap * 10) / 10,
      areaUsed: Math.round(areaUsed * 10) / 10,
      capacity,
      pallets,
      stack: actualStack,
      stackMax,
      status: pallets === 0 ? "free" : capacity - pallets <= 0 ? "full" : "partial",
      containerType: dom,
      topLot: cellLots[0]?.name ?? null,
      lots: cellLots,
      slotMap: parseSlotMap(loc.slotMap),
    });
  }

  // Group racks by zone → bay → levels (high to low)
  const rackZones = new Map<string, MapCell[]>();
  const floorZones = new Map<string, MapCell[]>();
  for (const c of cells) {
    (c.kind === "rack" ? rackZones : floorZones).set(
      c.zone,
      [...((c.kind === "rack" ? rackZones : floorZones).get(c.zone) ?? []), c]
    );
  }

  // Effective layout order within a zone: honour the user's saved drag order
  // (mapOrder) and fall back to natural numeric-code order for anything unset.
  const byCode = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

  const racks: RackZone[] = [...rackZones.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([zone, zcells]) => {
      const bayMap = new Map<string, MapCell[]>();
      for (const c of zcells) bayMap.set(c.bayCode, [...(bayMap.get(c.bayCode) ?? []), c]);
      // natural rank of each bay by code, used when no custom order is set
      const naturalBays = [...bayMap.keys()].sort(byCode);
      const bayRank = new Map(naturalBays.map((code, i) => [code, i]));
      // a bay's order = the smallest mapOrder among its levels (they share it
      // after a reorder), else its natural rank
      const bayOrder = (bayCode: string, lv: MapCell[]) => {
        const set = lv.map((c) => c.mapOrder).filter((n): n is number => n != null);
        return set.length ? Math.min(...set) : bayRank.get(bayCode) ?? 0;
      };
      const bays = [...bayMap.entries()]
        .map(([bayCode, lv]) => ({ bayCode, levels: lv.sort((a, b) => b.level - a.level) }))
        .sort((a, b) => bayOrder(a.bayCode, a.levels) - bayOrder(b.bayCode, b.levels));
      const cap = zcells.reduce((s, c) => s + c.capacity, 0);
      const used = zcells.reduce((s, c) => s + c.pallets, 0);
      return { zone, kind: "rack" as const, cap, used, bays };
    });

  const floors: FloorZone[] = [...floorZones.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([zone, zcells]) => {
      const naturalTiles = [...zcells].sort((a, b) => byCode(a.code, b.code));
      const tileRank = new Map(naturalTiles.map((c, i) => [c.code, i]));
      const tiles = [...zcells].sort(
        (a, b) => (a.mapOrder ?? tileRank.get(a.code)!) - (b.mapOrder ?? tileRank.get(b.code)!)
      );
      return {
        zone,
        kind: "floor" as const,
        cap: zcells.reduce((s, c) => s + c.capacity, 0),
        used: zcells.reduce((s, c) => s + c.pallets, 0),
        tiles,
      };
    });

  let free = 0;
  let partial = 0;
  let full = 0;
  let pallets = 0;
  let areaUsed = 0;
  let areaCap = 0;
  for (const c of cells) {
    if (c.status === "free") free++;
    else if (c.status === "full") full++;
    else partial++;
    pallets += c.pallets;
    areaUsed += c.areaUsed;
    areaCap += c.areaCap;
  }
  const summary: MapSummary = {
    positions: cells.length,
    free,
    partial,
    full,
    pallets,
    areaUsed: Math.round(areaUsed),
    areaCap: Math.round(areaCap),
    utilPct: areaCap > 0 ? Math.round((areaUsed / areaCap) * 100) : 0,
  };

  const zones = [...new Set(cells.map((c) => c.zone))].sort();
  const locationCodes = locations.map((l) => l.code).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return { racks, floors, summary, zones, locationCodes };
}
