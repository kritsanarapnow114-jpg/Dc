"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { updateLocationAction } from "@/lib/actions/locations";
import { showToast } from "@/components/ui/Toast";
import { Zone } from "@prisma/client";

export function EditLocationModal({
  location,
  open,
  onClose,
}: {
  location: { code: string; zone: string; width: number; length: number };
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [zone, setZone] = useState(location.zone as Zone);
  const [width, setWidth] = useState(String(location.width));
  const [length, setLength] = useState(String(location.length));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateLocationAction(location.code, {
        zone,
        width: Number(width) || 0,
        length: Number(length) || 0,
      });
      showToast("Location updated");
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <ModalHeader title={`Edit location (แก้ไขที่เก็บ) · ${location.code}`} onClose={onClose} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <Field label="Zone (โซน)">
          <select value={zone} onChange={(e) => setZone(e.target.value as Zone)} className={inputClass}>
            <option value="A">Zone A</option>
            <option value="B">Zone B</option>
            <option value="C">Zone C</option>
            <option value="D">Zone D</option>
            <option value="E">Zone E</option>
          </select>
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Width (m)">
            <input value={width} onChange={(e) => setWidth(e.target.value)} type="number" step="0.01" className={inputClass} />
          </Field>
          <Field label="Length (m)">
            <input value={length} onChange={(e) => setLength(e.target.value)} type="number" step="0.01" className={inputClass} />
          </Field>
        </div>
        {error && (
          <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">
            {error}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave} className={buttonClass("primary")}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const inputClass =
  "w-full rounded-[8px] border border-[#d7dce4] px-2.5 py-2 text-[13px] outline-none focus:border-[#2f86cf]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-medium text-[#69748a]">{label}</span>
      {children}
    </label>
  );
}
