"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/dal/auth-actions";

// Settings, Replay tour and Sign out behind one button, so the header fits a 320px phone next to + New.
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="header-menu"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary min-h-9 px-2.5"
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 5h12M3 9h12M3 13h12" />
        </svg>
      </button>
      {open && (
        <div id="header-menu" className="absolute right-0 z-20 mt-2 w-44 rounded-control border border-line bg-surface py-1 shadow-md">
          <Link href="/settings" onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 text-[15px] active:bg-light">
            Settings
          </Link>
          <Link href="/?tour=1" onClick={() => setOpen(false)} className="flex min-h-11 items-center px-4 text-[15px] active:bg-light">
            Replay tour
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex min-h-11 w-full items-center px-4 text-left text-[15px] active:bg-light">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
