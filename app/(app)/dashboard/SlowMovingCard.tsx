"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Money } from "@/components/ui/Currency";
import { Modal, ModalHeader } from "@/components/ui/Modal";

type Row = { code: string; name: string; onHand: number; value: number; lastText: string; days: number };

export function SlowMovingCard({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center">
        <div className="flex-1 text-[14px] font-semibold">
          Slow-moving Stock (สินค้าเคลื่อนไหวช้า)
        </div>
        <button onClick={() => setOpen(true)} className="text-[12px] text-[#2f86cf]">
          View all →
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {rows.slice(0, 3).map((s) => (
          <Row key={s.code} s={s} />
        ))}
        {rows.length === 0 && (
          <div className="p-3 text-center text-[12.5px] text-[#9aa4b4]">
            Nothing slow-moving right now
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} width={560}>
        <ModalHeader title="Slow-moving Stock (สินค้าเคลื่อนไหวช้า)" onClose={() => setOpen(false)} />
        <div className="max-h-[420px] overflow-auto p-3">
          <div className="flex flex-col gap-2">
            {rows.map((s) => (
              <Row key={s.code} s={s} />
            ))}
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function Row({ s }: { s: Row }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-[#f7f9fb] px-3 py-2.5 text-[13px]">
      <span className="font-num w-16 text-[11px] text-[#9aa4b4]">{s.code}</span>
      <span className="flex-1">{s.name}</span>
      <span className="text-[12px] text-[#69748a]">
        last {s.lastText} · {s.days === 9999 ? "never" : `${s.days}d`}
      </span>
      <span className="font-num w-24 text-right text-[#3a4658]">
        <Money value={s.value} />
      </span>
    </div>
  );
}
