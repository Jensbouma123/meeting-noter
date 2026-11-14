import type { ReactNode } from "react";

/** The trigger's `anchor-name`, which the top-layer panel positions against. */
export const anchorNameFor = (listboxId: string) => `--ss-${listboxId.replace(/[^\w-]/g, "")}`;

export function OptionAdornment({ icon }: { icon: ReactNode }) {
  if (!icon) return null;
  return (
    <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
      {icon}
    </span>
  );
}

/** Wraps the first case-insensitive `query` match in `<mark>` by plain string slicing — never HTML parsing. */
export function highlightMatch(label: string, query: string): ReactNode {
  if (!query) return label;
  const start = label.toLowerCase().indexOf(query);
  if (start === -1) return label;
  const end = start + query.length;
  return (
    <>
      {label.slice(0, start)}
      <mark className="bg-primary-500/15 text-primary-900 dark:bg-primary-400/25 dark:text-primary-200 rounded-xs px-0.5 font-semibold">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}
