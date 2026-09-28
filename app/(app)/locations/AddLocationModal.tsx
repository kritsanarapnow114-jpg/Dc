"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { createLocationAction, FormState } from "@/lib/actions/locations";
import { showToast } from "@/components/ui/Toast";

const initialState: FormState = {};

export function AddLocationButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("accent")}>
        ＋ Add location (เพิ่มที่เก็บ)
      </button>
      <AddLocationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddLocationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const res = await createLocationAction(prev, fd);
      if (!res.error) {
        showToast("Location added");
        router.refresh();
        onClose();
      }
      return res;
    },
    initialState
  );

  return (
    <Modal open={open} onClose={onClose} width={440}>
      <ModalHeader title="Add location (เพิ่มที่เก็บ)" onClose={onClose} />
      <form action={formAction} className="flex flex-col gap-3 px-5 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bin code (รหัสที่เก็บ)">
            <input name="code" required className={inputClass} />
          </Field>
          <Field label="Zone (โซน)">
            <select name="zone" required defaultValue="A" className={inputClass}>
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
              <option value="D">Zone D</option>
              <option value="E">Zone E</option>
            </select>
          </Field>
        </div>
        <div className="rounded-[10px] bg-[#f7f9fb] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#69748a]">
            Capacity = width × length
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Width (m)">
              <input
                name="width"
                type="number"
                step="0.01"
                defaultValue={2.5}
                className={inputClass}
              />
            </Field>
            <Field label="Length (m)">
              <input
                name="length"
                type="number"
                step="0.01"
                defaultValue={2.5}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
        {state.error && (
          <div className="rounded-[8px] bg-[#fbe9e9] px-3 py-2 text-[12.5px] text-[#c53f3f]">
            {state.error}
          </div>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
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
