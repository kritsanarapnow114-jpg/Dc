export type NavItem = {
  key: string;
  href: string;
  icon: string;
  en: string;
  th: string;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "▤", en: "Dashboard", th: "แดชบอร์ด" },
  { key: "products", href: "/products", icon: "▦", en: "Products", th: "รายการสินค้า" },
  { key: "aging", href: "/aging", icon: "◔", en: "Inventory Aging", th: "อายุคงเหลือ" },
  { key: "locations", href: "/locations", icon: "▧", en: "Locations", th: "ที่จัดเก็บ" },
  { key: "map", href: "/map", icon: "▨", en: "Map Location", th: "แผนผังคลัง" },
  { key: "receive", href: "/receive", icon: "▼", en: "Receive", th: "รับสินค้า" },
  { key: "po", href: "/po", icon: "◫", en: "Purchase Order", th: "ใบสั่งซื้อ" },
  { key: "issue", href: "/issue", icon: "▲", en: "Goods Issue", th: "จ่ายสินค้า (FEFO)" },
  { key: "ship", href: "/ship", icon: "🚚", en: "Ship Order", th: "ออเดอร์จัดส่ง" },
  { key: "customers", href: "/customers", icon: "☺", en: "Customers", th: "ลูกค้า" },
  { key: "returns", href: "/returns", icon: "↩", en: "Customer Returns", th: "รับคืนสินค้า" },
  { key: "adjust", href: "/adjust", icon: "◆", en: "Adjust", th: "ปรับปรุงสต็อก" },
  { key: "transfer", href: "/transfer", icon: "⇄", en: "Put Away", th: "จัดเก็บเข้าที่" },
  { key: "count", href: "/count", icon: "☑", en: "Stock Count", th: "นับสต็อก" },
  { key: "stockcard", href: "/stock-card", icon: "▤", en: "Stock Card", th: "การ์ดสต็อก" },
  { key: "abc", href: "/abc", icon: "◧", en: "ABC Analysis", th: "วิเคราะห์ ABC" },
  { key: "reports", href: "/reports", icon: "▥", en: "Reports", th: "รายงานสรุป" },
];

/** Sidebar sections: a big heading with its sub-items, so the long menu is
 *  easier to scan. Item keys reference NAV_ITEMS above. */
export type NavGroup = { key: string; en: string; th: string; items: string[] };

export const NAV_GROUPS: NavGroup[] = [
  { key: "overview", en: "Overview", th: "ภาพรวม", items: ["dashboard"] },
  {
    key: "inventory",
    en: "Inventory",
    th: "สินค้าคงคลัง",
    items: ["products", "stockcard", "aging", "locations", "map", "adjust", "count"],
  },
  { key: "inbound", en: "Inbound", th: "ขาเข้า", items: ["receive", "po", "transfer", "returns"] },
  { key: "outbound", en: "Outbound", th: "ขาออก", items: ["ship", "issue", "customers"] },
  {
    key: "analytics",
    en: "Analytics & Reports",
    th: "วิเคราะห์ & รายงาน",
    items: ["abc", "reports"],
  },
];

export const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Dashboard", sub: "แดชบอร์ด · Warehouse overview" },
  "/products": { title: "Products", sub: "รายการสินค้า · Master catalog & on-hand" },
  "/aging": { title: "Inventory Aging", sub: "อายุคงเหลือ · Age & expiry risk" },
  "/locations": { title: "Locations", sub: "ที่จัดเก็บ · Bin capacity & utilization" },
  "/map": { title: "Map Location", sub: "แผนผังคลัง · ผังตำแหน่งจัดเก็บ · Rack ชั้น L1-L3 + พื้นวางซ้อน" },
  "/receive": { title: "Receive", sub: "รับสินค้า · Goods receipt (ตาม PO)" },
  "/po": { title: "Purchase Order", sub: "ใบสั่งซื้อ · PO tracking" },
  "/issue": { title: "Goods Issue", sub: "จ่ายสินค้า · FEFO outbound (ภายใน/ภายนอก)" },
  "/ship": { title: "Ship Order", sub: "ออเดอร์จัดส่ง · Sales/ship orders → จัดส่ง (FEFO) ตัดสต็อก" },
  "/customers": { title: "Customers", sub: "ลูกค้า · ทะเบียนลูกค้า & ที่อยู่จัดส่ง (Ship-to)" },
  "/returns": { title: "Customer Returns", sub: "รับคืนสินค้า · ตรวจสภาพ → คืนสต็อก / กักตรวจ (QC) / ตัดทิ้ง" },
  "/adjust": { title: "Adjust", sub: "ปรับปรุงสต็อก · Stock adjustment" },
  "/transfer": { title: "Put Away", sub: "จัดเก็บเข้าที่ · Bin-to-bin" },
  "/count": { title: "Stock Count", sub: "นับสต็อก · Cycle count" },
  "/stock-card": { title: "Stock Card", sub: "การ์ดสต็อก · ความเคลื่อนไหวรายสินค้า (รับ/จ่าย/คงเหลือ)" },
  "/abc": { title: "ABC Analysis", sub: "วิเคราะห์ ABC · Pareto by value (A/B/C)" },
  "/reports": { title: "Reports", sub: "รายงานสรุป · Receiving, Issuing, Loss, Returns, PO, Transfer" },
  "/settings": { title: "Settings", sub: "ตั้งค่า · Data management" },
  "/search": { title: "Search", sub: "ค้นหา · สินค้า / PO / Invoice / SAP Material Document / Lot" },
};
