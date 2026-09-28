"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SearchableOption = { value: string; label: string };

/**
 * A type-to-filter "+ Add line" picker — visually a dashed-border box like the
 * plain <select> it replaces, but lets you type to narrow a long product list.
 * The dropdown renders in a portal (fixed-positioned to the input) so it is
 * never clipped by an ancestor's `overflow:hidden` or covered inside a modal.
 */
export function SearchableSelect({
  options,
  onSelect,
  placeholder,
  value,
  className = "w-full rounded-[9px] border border-dashed border-[#c4ccd8] bg-[#f7f9fb] px-3 py-2 text-[13px] text-[#3a4658] outline-none focus:border-[#2f86cf]",
}: {
  options: SearchableOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  /** When provided, the box behaves like a combobox that shows this label as
   *  the current selection while idle (instead of clearing after each pick). */
  value?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = q === "" ? options : options.filter((o) => o.label.toLowerCase().includes(q));
  // While focused, show what the user is typing; otherwise show the current
  // selection label (combobox mode) or nothing (plain add-picker mode).
  const shown = open ? query : value ?? query;

  function measure() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  }

  useEffect(() => {
    if (!open) return;
    measure();
    const onScrollResize = () => measure();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

  const dropdown =
    open && rect && typeof document !== "undefined"
      ? createPortal(
          <div
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
              minWidth: rect.width,
              maxWidth: Math.min(window.innerWidth - rect.left - 8, 460),
            }}
            className="z-[100] max-h-64 overflow-auto rounded-[9px] border border-[#d7dce4] bg-white shadow-[0_8px_24px_rgba(20,30,48,.16)]"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[12.5px] text-[#9aa4b4]">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(o.value);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full whitespace-normal break-words px-3 py-2 text-left text-[13px] leading-snug text-[#3a4658] hover:bg-[#f7f9fb]"
                >
                  {o.label}
                </button>
              ))
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={shown}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className={className}
      />
      {dropdown}
    </div>
  );
}
