import Link from "next/link";
import { setTabsPreference } from "@/app/actions/tabs";

export interface TabsBarProps {
  tabs: { key: string; label: string; count: number }[];
  active: string | null;
  hrefFor: (cat: string | null) => string;
  /** The current list URL, to return to after toggling. */
  currentHref: string;
}

export function TabsSwitch({ on, currentHref }: { on: boolean; currentHref: string }) {
  return (
    <form action={setTabsPreference} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="value" value={on ? "off" : "on"} />
      <input type="hidden" name="next" value={currentHref} />
      <span aria-hidden className="text-sm font-semibold text-mid">Tabs</span>
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-label="Category tabs"
        className="flex min-h-11 min-w-11 items-center justify-center"
      >
        <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${on ? "bg-[#2e7d4f]" : "bg-chip"}`}>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
          />
        </span>
      </button>
    </form>
  );
}

const tabClass = (active: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold ${
    active ? "bg-primary text-on-primary" : "bg-chip text-mid"
  }`;

export function CategoryTabs({ tabs, active, hrefFor, currentHref }: TabsBarProps) {
  return (
    <div className="flex items-center gap-2">
      <nav aria-label="Categories" className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        <Link href={hrefFor(null)} aria-current={active === null ? "page" : undefined} className={tabClass(active === null)}>
          All
        </Link>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            aria-current={active === t.key ? "page" : undefined}
            className={tabClass(active === t.key)}
          >
            {t.label}
            <span className="font-semibold opacity-80">{t.count}</span>
          </Link>
        ))}
      </nav>
      <TabsSwitch on currentHref={currentHref} />
    </div>
  );
}
