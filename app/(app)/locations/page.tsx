import Link from "next/link";
import { getLocationRows, getLocationSummary, getZonesInUse } from "@/lib/views/locations";
import { getAppSettings } from "@/lib/views/settings";
import { zoneLabelKey } from "@/lib/settingsKeys";
import { ZONE_LABEL } from "@/components/ui/tone";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AddLocationButton } from "./AddLocationModal";
import { LocationsTable } from "./LocationsTable";
import { ZoneLabelsEditor } from "./ZoneLabelsEditor";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  const { zone } = await searchParams;
  const [rows, summary, zonesInUse, settings] = await Promise.all([
    getLocationRows({ zone }),
    getLocationSummary(),
    getZonesInUse(),
    getAppSettings(),
  ]);

  // Effective zone descriptions: user override (settings) else built-in default.
  const zoneLabels: Record<string, string> = {};
  for (const z of zonesInUse) {
    zoneLabels[z] = settings[zoneLabelKey(z)] ?? ZONE_LABEL[z] ?? "";
  }

  const ZONE_FILTERS = [
    { value: "", label: "All zones" },
    ...zonesInUse.map((z) => ({ value: z, label: `Zone ${z}` })),
  ];

  const binCount = rows.length;
  const avgOcc =
    binCount > 0
      ? Math.round((rows.reduce((s, r) => s + r.pct, 0) / binCount) * 10) / 10
      : 0;

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (zone) p.set("zone", zone);
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="max-w-[1280px] p-[22px_26px]">
      <Card className="mb-4">
        <CardTitle>Total storage used (พื้นที่ใช้รวมทุกโซน)</CardTitle>
        <div className="flex items-center gap-8">
          <div className="font-num text-[27px] font-bold tracking-tight text-[#16202e]">
            {summary.totalUsed.toLocaleString()} / {summary.totalCap.toLocaleString()} m²
          </div>
          <div className="max-w-[420px] flex-1">
            <div className="mb-1.5 flex justify-between text-[12px] font-semibold">
              <span>Utilization (การใช้พื้นที่)</span>
              <span className="font-num">{summary.totalPct}%</span>
            </div>
            <ProgressBar pct={summary.totalPct} color={summary.totalColor} />
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {ZONE_FILTERS.map((f) => {
          const active = (zone ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={`/locations${qs({ zone: f.value })}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
                active
                  ? "bg-[#2f86cf] text-white"
                  : "border border-[#e2e6ec] bg-white text-[#3a4658]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <div className="text-[12px] text-[#69748a]">
          {binCount} bins · avg {avgOcc}% used
        </div>
        <ZoneLabelsEditor zones={zonesInUse} labels={zoneLabels} />
        <AddLocationButton />
        <a
          href={`/api/export/locations${qs({})}`}
          className="flex items-center gap-1.5 rounded-[8px] border border-[#16a6bf] bg-[#e8f2fb] px-3.5 py-2 text-[12.5px] font-semibold text-[#0c7f93]"
        >
          ⤓ Export Excel
        </a>
      </div>

      <LocationsTable rows={rows} zoneLabels={zoneLabels} />
    </div>
  );
}
