import { getMapLocationData } from "@/lib/views/mapLocation";
import { MapLocation } from "./MapLocation";

export default async function MapLocationPage() {
  const data = await getMapLocationData();
  return (
    <MapLocation
      racks={data.racks}
      floors={data.floors}
      summary={data.summary}
      zones={data.zones}
      locationCodes={data.locationCodes}
    />
  );
}
