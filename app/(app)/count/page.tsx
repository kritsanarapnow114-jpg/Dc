import { getRecentCounts, getLotOptions, getProductOptions, getLocationCodes } from "@/lib/views/docCommon";
import { getZonesInUse } from "@/lib/views/locations";
import { getAppSettings } from "@/lib/views/settings";
import { zoneLabelKey } from "@/lib/settingsKeys";
import { ZONE_LABEL } from "@/components/ui/tone";
import { CountForm } from "./CountForm";
import { DocHistory, DocHistoryRow } from "@/components/ui/DocHistory";

export default async function CountPage() {
  const [counts, lots, products, locations, zonesInUse, settings] = await Promise.all([
    getRecentCounts(),
    getLotOptions(),
    getProductOptions(),
    getLocationCodes(),
    getZonesInUse(),
    getAppSettings(),
  ]);

  // Every zone that actually holds bins, with the user's custom label, so the
  // count "pull by zone" dropdown reaches all stock (not just A/B/C).
  const zones = zonesInUse.map((z) => ({
    code: z,
    label: settings[zoneLabelKey(z)] ?? ZONE_LABEL[z as keyof typeof ZONE_LABEL] ?? "",
  }));

  const rows: DocHistoryRow[] = counts.map((c) => ({
    id: c.id,
    docNo: c.docNo,
    docDate: c.docDate,
    summary: c.pullZone,
    reversedAt: c.reversedAt,
    lineCount: c.lineCount,
    lines: c.lines.map((l) => {
      const variance = l.countedQty - l.sysQty;
      return {
        code: l.code,
        name: l.name,
        qtyText: `${l.countedQty.toLocaleString()} ${l.unit}`,
        extra: `Lot ${l.lotNo} · ${l.locationCode} · var ${variance > 0 ? "+" : ""}${variance}`,
        lotNo: l.lotNo,
        location: l.locationCode,
        sysText: l.sysQty.toLocaleString(),
        countText: l.countedQty.toLocaleString(),
      };
    }),
  }));

  return (
    <div className="max-w-[1240px] p-[22px_26px]">
      <CountForm lots={lots} products={products} locations={locations} zones={zones} />
      <DocHistory title="Recent Counts (ประวัติการนับสต็อก)" rows={rows} accentColor="#2f86cf" reverseKind="count" printSheet="count" />
    </div>
  );
}
