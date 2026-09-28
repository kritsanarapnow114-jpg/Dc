// Container / packaging form each product is stored as on the warehouse floor.
// Client-safe (no server imports) so both the product form and the map can use it.
export type ContainerTypeDef = {
  code: string;
  en: string;
  th: string;
  abbr: string; // short tag for tight spaces (map tiles)
  color: string; // fill hue on the storage map (distinct from the free-slot green)
};

export const CONTAINER_TYPES: ContainerTypeDef[] = [
  { code: "IBC", en: "IBC", th: "IBC (ถังพลาสติกกรง)", abbr: "IBC", color: "#2f6fd0" },
  { code: "SUPERSACK", en: "Supersack", th: "ซุปเปอร์แซค", abbr: "SS", color: "#8a5cd8" },
  { code: "BOX", en: "Box", th: "กล่อง", abbr: "BOX", color: "#e08a2b" },
  { code: "OCTABIN", en: "Octabin", th: "ออคตาบิน", abbr: "OCT", color: "#b7671a" },
  { code: "BAG", en: "Bag on pallet", th: "ถุงวางพาเลท", abbr: "BAG", color: "#d059a3" },
  { code: "DRUM", en: "Drum", th: "ถัง (Drum)", abbr: "DRM", color: "#3f9aa8" },
  { code: "OTHER", en: "Other", th: "อื่นๆ", abbr: "-", color: "#8a94a6" },
];

export const CONTAINER_LABEL: Record<string, ContainerTypeDef> = Object.fromEntries(
  CONTAINER_TYPES.map((t) => [t.code, t])
);

export const CONTAINER_CODES = CONTAINER_TYPES.map((t) => t.code);

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

// Stable pleasant colour for a user-defined pack type name.
function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 52% 46%)`;
}

/** Resolve a pack-type value to a display def. Matches a built-in by code or
 *  English name; otherwise treats it as a user-defined type and gives it a
 *  stable auto colour so custom pack types still render on the map. */
export function containerDef(value: string | null | undefined): ContainerTypeDef {
  if (!value || !value.trim()) return CONTAINER_LABEL.OTHER;
  const key = norm(value);
  const builtin = CONTAINER_TYPES.find((t) => t.code === key || norm(t.en) === key);
  if (builtin) return builtin;
  const name = value.trim();
  // custom pack type → short readable tag from the first alphanumerics
  const abbr = (name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 4) || name.slice(0, 4)).toUpperCase();
  return { code: name, en: name, th: name, abbr, color: hashColor(key) };
}
