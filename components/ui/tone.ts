export type Tone = "ok" | "warn" | "danger" | "neutral" | "accent";

export const TONE_COLORS: Record<Tone, { bg: string; text: string }> = {
  ok: { bg: "#e7f5ee", text: "#1b7a48" },
  warn: { bg: "#fbf1df", text: "#b5790f" },
  danger: { bg: "#fbe9e9", text: "#c53f3f" },
  neutral: { bg: "#eef1f5", text: "#69748a" },
  accent: { bg: "#eaf0f8", text: "#3b5b8f" },
};

export const CATEGORY_COLORS: Record<string, string> = {
  RAW_MATERIAL: "#4f7fd9",
  PACKAGING: "#22c58e",
  FINISHED_GOODS: "#f7a63b",
  SPARE_PARTS: "#7b6ef0",
};
export const CATEGORY_COLOR_FALLBACK = "#94a3b8";

export const CATEGORY_LABEL: Record<string, { en: string; th: string }> = {
  RAW_MATERIAL: { en: "Raw Material", th: "วัตถุดิบ" },
  PACKAGING: { en: "Packaging", th: "บรรจุภัณฑ์" },
  FINISHED_GOODS: { en: "Finished Goods", th: "สินค้าสำเร็จรูป" },
  SPARE_PARTS: { en: "IO & Resin", th: "IO & Resin" },
};

export const ZONE_LABEL: Record<string, string> = {
  A: "Dry raw material",
  B: "Liquids",
  C: "Packaging",
  D: "Finished goods",
  E: "Spare parts",
};

export const MOVEMENT_TYPE_TONE: Record<string, Tone> = {
  Receive: "ok",
  Issue: "danger",
  Adjust: "accent",
  Transfer: "ok",
  Return: "warn",
  Opening: "neutral",
};
