"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const FADE = "2rem";

/**
 * Horizontal scroller for the category tabs. Each edge fades out while there is more to scroll that way, so
 * a cut-off pill reads as "more", and the selected tab scrolls into view on load (owner feedback 2026-10-05:
 * the active pill was cut off).
 */
export function TabsScroller({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const overflowRight = active.offsetLeft + active.offsetWidth - (nav.scrollLeft + nav.clientWidth);
      if (overflowRight > -24) nav.scrollLeft += overflowRight + 32;
      else if (active.offsetLeft < nav.scrollLeft) nav.scrollLeft = active.offsetLeft - 32;
    }
    const update = () =>
      setEdges({ left: nav.scrollLeft > 2, right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2 });
    update();
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      nav.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const mask = `linear-gradient(to right, ${edges.left ? "transparent" : "black"}, black ${FADE}, black calc(100% - ${FADE}), ${
    edges.right ? "transparent" : "black"
  })`;
  return (
    <nav
      ref={ref}
      aria-label={label}
      className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </nav>
  );
}
