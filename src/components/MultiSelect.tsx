"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { id: string; name: string };

// Dropdown pilih banyak orang (checkbox), pengganti <select multiple> bawaan
// browser -- versi native selalu nampilin daftar panjang yang makan tempat
// dan butuh Ctrl/Cmd+klik yang tidak intuitif. Ini tertutup secara default,
// cuma nampilin ringkasan nama yang sudah dipilih.
//
// Panel-nya di-portal ke <body> (bukan anak langsung tombolnya) supaya tidak
// pernah kepotong -- tombol ini dipakai di dalam tabel yang scroll
// horizontal (overflow-x-auto), dan panel dropdown biasa yang jadi anak
// langsung ikut ke-clip kalau baris-nya dekat batas bawah tabel.
export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Pilih orang"
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function close(e: Event) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    // Scroll di manapun (termasuk area scroll horizontal tabel) menggeser
    // posisi tombol, jadi tutup saja daripada panel-nya "lepas" mengambang.
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  const selectedNames = options.filter((o) => selected.includes(o.id)).map((o) => o.name);
  const label =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length <= 2
        ? selectedNames.join(", ")
        : `${selectedNames[0]}, +${selectedNames.length - 1} lainnya`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`field-input flex w-full items-center justify-between gap-1 text-left ${
          selectedNames.length === 0 ? "text-ink/40" : "text-ink"
        }`}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-ink/40">&#9662;</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 176) }}
            className="z-50 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
          >
            {options.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-line/40"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() => toggle(o.id)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="truncate text-ink">{o.name}</span>
              </label>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
