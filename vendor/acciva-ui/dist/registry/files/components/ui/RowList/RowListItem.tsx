import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface RowListItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "title"> {
  /** Primary line. */
  title: ReactNode;
  /** Secondary muted line: timestamp, subtitle, detail. */
  meta?: ReactNode;
  /** Leading slot: icon, avatar, status dot. Must be inert. */
  leading?: ReactNode;
  /** Trailing slot: badge, count, value. Must be inert. */
  trailing?: ReactNode;
}

export const RowListItem = forwardRef<HTMLLIElement, RowListItemProps>(function RowListItem(
  { title, meta, leading, trailing, className, ...props },
  ref,
) {
  return (
    <li ref={ref} className={cn("flex min-h-11 items-center gap-3 py-2", className)} {...props}>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block wrap-break-word text-sm font-medium text-foreground">{title}</span>
        {meta ? (
          <span className="block wrap-break-word text-xs text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </li>
  );
});
