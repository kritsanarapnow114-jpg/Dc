import { getReceiveFormData, getRecentReceipts } from "@/lib/views/receive";
import { ReceiveForm } from "./ReceiveForm";
import { DocHistory, DocHistoryRow } from "@/components/ui/DocHistory";

export default async function ReceivePage() {
  const [data, receipts] = await Promise.all([getReceiveFormData(), getRecentReceipts()]);

  const rows: DocHistoryRow[] = receipts.map((r) => ({
    id: r.id,
    docNo: r.docNo,
    docDate: r.docDate,
    summary: r.poNo ? `By PO · ${r.poNo}` : "By PO · No PO",
    reversedAt: r.reversedAt,
    materialDoc: r.materialDoc,
    remark: r.remark,
    lineCount: r.lineCount,
    lines: r.lines.map((l) => ({
      code: l.code,
      name: l.name,
      qtyText: `${l.recvQty.toLocaleString()} ${l.unit}`,
      extra: `Lot ${l.lotNo} · ${l.locationCode}`,
      edit: {
        id: l.id,
        productCode: l.code,
        recvQty: l.recvQty,
        lotNo: l.lotNo,
        locationCode: l.locationCode,
        mfgDate: l.mfgDate,
        expDate: l.expDate,
      },
    })),
  }));

  const productOptions = data.products.map((p) => ({ code: p.code, name: p.name }));

  return (
    <div className="max-w-[1240px] p-[22px_26px]">
      <ReceiveForm data={data} />

      <div className="mt-6">
        <DocHistory
          title="Recent Receipts (ประวัติการรับสินค้า)"
          rows={rows}
          accentColor="#a8121c"
          reverseKind="receipt"
          productOptions={productOptions}
          locationOptions={data.locations}
        />
      </div>
    </div>
  );
}
