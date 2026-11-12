import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FooterBarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Start-edge actions, typically icon buttons. */
  leading?: ReactNode;
  /** End-edge actions, typically icon buttons. */
  trailing?: ReactNode;
}

/**
 * A bottom action bar: a `border` top rule over a `surface` row. `px-safe` and `pb-safe`
 * pad the bar over the safe area, so the background bleeds under the home indicator while
 * the row stays clear of it (see [[pwa]]). `ml-auto` pins the trailing group to the end edge.
 */
export const FooterBar = forwardRef<HTMLElement, FooterBarProps>(function FooterBar(
  { leading, trailing, className, ...props },
  ref,
) {
  return (
    <footer ref={ref} className={cn("border-t border-border bg-surface px-safe pb-safe", className)} {...props}>
      <div className="flex min-h-14 items-center gap-2 px-4">
        <div className="flex min-w-0 items-center gap-1">{leading}</div>
        <div className="ml-auto flex min-w-0 items-center gap-1">{trailing}</div>
      </div>
    </footer>
  );
});
