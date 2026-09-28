import "server-only";
import { getReportData } from "./reports";
import {
  getInventoryStats,
  getMovementDetail,
  getMovementBuckets,
  getTopVendors,
  MovementBucket,
  Range,
} from "./dashboard";

export type { MovementBucket };

export type CompareMetric = {
  key: string;
  label: string;
  th: string;
  a: number;
  b: number;
  money: boolean;
  goodUp: boolean; // true = higher is better (green), false = higher is worse (loss)
};

export type MoverRow = { code: string; name: string; qty: number };
export type VendorRow = { name: string; value: number; docs: number };

export async function getPeriodComparison(a: Range, b: Range) {
  const [ra, rb, sa, sb, ma, mb, va, vb, mva, mvb] = await Promise.all([
    getReportData(a),
    getReportData(b),
    getInventoryStats(a),
    getInventoryStats(b),
    getMovementDetail(a, 5),
    getMovementDetail(b, 5),
    getTopVendors(a, 5),
    getTopVendors(b, 5),
    getMovementBuckets(a),
    getMovementBuckets(b),
  ]);

  const metrics: CompareMetric[] = [
    { key: "recv", label: "Received", th: "รับเข้า (หน่วย)", a: ra.receiving.totalUnits, b: rb.receiving.totalUnits, money: false, goodUp: true },
    { key: "recvDocs", label: "Receipts", th: "ใบรับเข้า (เอกสาร)", a: ra.receiving.docCount, b: rb.receiving.docCount, money: false, goodUp: true },
    { key: "iss", label: "Issued", th: "จ่ายออก (หน่วย)", a: ra.issuing.totalUnits, b: rb.issuing.totalUnits, money: false, goodUp: true },
    { key: "issDocs", label: "Issues", th: "ใบจ่ายออก (เอกสาร)", a: ra.issuing.docCount, b: rb.issuing.docCount, money: false, goodUp: true },
    { key: "returns", label: "Returned", th: "รับคืน (หน่วย)", a: ra.returns.totalUnits, b: rb.returns.totalUnits, money: false, goodUp: false },
    { key: "transfer", label: "Transferred", th: "โอนย้าย (หน่วย)", a: ra.transfer.totalUnits, b: rb.transfer.totalUnits, money: false, goodUp: true },
    { key: "loss", label: "Loss value", th: "มูลค่าสูญเสีย", a: ra.loss.totalValue, b: rb.loss.totalValue, money: true, goodUp: false },
    { key: "inv", label: "Inventory value (end)", th: "มูลค่าคงคลัง (สิ้นช่วง)", a: sa.inventoryValue, b: sb.inventoryValue, money: true, goodUp: true },
  ];

  return {
    metrics,
    receivedTop: { a: ma.received, b: mb.received },
    issuedTop: { a: ma.issued, b: mb.issued },
    vendors: { a: va, b: vb },
    movement: { a: mva, b: mvb },
  };
}
