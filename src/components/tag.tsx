export type TagKind = "trial" | "needsUpdate" | "ending";

const LABELS: Record<TagKind, string> = { trial: "Trial", needsUpdate: "Needs update", ending: "Ending" };

const STYLES: Record<TagKind, string> = {
  trial: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  needsUpdate: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
  ending: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
};

export function Tag({ kind }: { kind: TagKind }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[kind]}`}>
      {LABELS[kind]}
    </span>
  );
}
