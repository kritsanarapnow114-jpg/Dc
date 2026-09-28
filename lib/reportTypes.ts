// Plain (non-"use server", non-server-only) module so both the server action
// and the client runner can import these. A "use server" file may only export
// async functions, so these values/types must live here.

export const REPORT_TYPES = [
  { value: "receiving", label: "Receiving (รับสินค้า)" },
  { value: "issuing", label: "Issuing (จ่ายสินค้า)" },
  { value: "loss", label: "Loss (สูญเสีย)" },
  { value: "returns", label: "Customer Returns (รับคืนสินค้า)" },
  { value: "po", label: "Purchase Orders (ใบสั่งซื้อ)" },
  { value: "transfer", label: "Transfers (ย้ายที่เก็บ)" },
  { value: "count", label: "Stock Count (นับสต็อก)" },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]["value"];
export type ReportRows = { cols: string[]; rows: (string | number)[][] };
