import type { ReactNode } from "react";

export interface ActionRowProps {
  /** Leading slot: avatar, status dot. Inert. */
  leading?: ReactNode;
  /** Primary line. May hold a control when the block offers select. */
  title: ReactNode;
  /** Secondary muted line. Inert. */
  meta?: ReactNode;
  /** Inert trailing value: timestamp, count. */
  trailing?: ReactNode;
  /** Interactive controls (Dismiss, Remove), beside the row, outside the inert slots (SC 4.1.2). */
  actions?: ReactNode;
}

/**
 * A `<li>` row for blocks whose rows carry buttons. Mirrors `RowList.Item` layout, but
 * the action controls sit in their own trailing group instead of inside an inert slot.
 */
export function ActionRow({ leading, title, meta, trailing, actions }: ActionRowProps) {
  return (
    <li className="flex min-h-11 items-center gap-3 py-2">
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block wrap-break-word text-sm font-medium text-foreground">{title}</span>
        {meta ? (
          <span className="block wrap-break-word text-xs text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      {trailing || actions ? (
        <span className="flex shrink-0 items-center gap-2">
          {trailing}
          {actions}
        </span>
      ) : null}
    </li>
  );
}
