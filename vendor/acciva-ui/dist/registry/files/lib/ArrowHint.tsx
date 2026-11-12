import { cn } from "@/lib/utils";

export interface ArrowHintProps {
  id: string;
  text: string | null;
  visible: boolean;
  className?: string;
}

/**
 * Visual caption for `useArrowHint`. Absolute, so it never shifts layout; the
 * parent must be `relative`. aria-hidden: the same text reaches assistive tech
 * through aria-describedby on the group while visible.
 */
export function ArrowHint({ id, text, visible, className }: ArrowHintProps) {
  if (!visible || !text) return null;
  return (
    <span
      id={id}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-0 top-full z-10 mt-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground shadow-sm motion-safe:animate-fade-in",
        className,
      )}
    >
      {text}
    </span>
  );
}
