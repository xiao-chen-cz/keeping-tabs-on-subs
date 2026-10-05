export type TagKind = "trial" | "needsUpdate" | "ending" | "quiet";

const LABELS: Record<TagKind, string> = { trial: "Trial", needsUpdate: "Needs update", ending: "Ending", quiet: "Quiet" };

const STYLES: Record<TagKind, string> = {
  trial: "border-primary-ink/30 bg-primary-light text-primary-ink",
  needsUpdate: "border-warn-line bg-warn-bg text-warn-ink",
  ending: "border-line bg-light text-mid",
  quiet: "border-line bg-surface text-mid",
};

export function Tag({ kind }: { kind: TagKind }) {
  return <span className={`pill ${STYLES[kind]}`}>{LABELS[kind]}</span>;
}
