import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { BODY_ROW_CLASS, CELL_CLASS, HEAD_CELL_CLASS, HEAD_ROW_CLASS, ROW_HEAD_CLASS, TABLE_CLASS } from "@/components/ui/Table/classes";

export type TableDensity = "comfortable" | "compact";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Names the scroll region for screen readers (WCAG 1.3.1). */
  label: string;
  /** Cell padding. `compact` suits dense reference tables. */
  density?: TableDensity;
  /** Pins the first column while the rest scrolls horizontally. */
  stickyFirstColumn?: boolean;
  /** Minimum table width so narrow screens scroll instead of squashing columns, e.g. `"min-w-4xl"`. */
  minWidthClassName?: string;
}

/**
 * A native `<table>` inside a focusable, labelled scroll region: keyboard users can scroll it
 * (SC 2.1.1) and assistive tech announces it (SC 1.3.1).
 */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { label, density = "comfortable", stickyFirstColumn = false, minWidthClassName, className, children, ...props },
  ref,
) {
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={label}
      className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-focus-ring"
    >
      <table
        ref={ref}
        data-compact={density === "compact" || undefined}
        data-sticky-first={stickyFirstColumn || undefined}
        className={cn(TABLE_CLASS, minWidthClassName, className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

export const TableHead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHead({ className, ...props }, ref) {
    return <thead ref={ref} className={cn("text-xs", className)} {...props} />;
  },
);

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody(props, ref) {
    return <tbody ref={ref} {...props} />;
  },
);

/** `header` marks a row inside `TableHead` so it gets the header surface. */
export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement> & { header?: boolean }>(
  function TableRow({ header = false, className, ...props }, ref) {
    return <tr ref={ref} className={cn(header ? HEAD_ROW_CLASS : BODY_ROW_CLASS, className)} {...props} />;
  },
);

/** Header cell. `scope` defaults to `col`; pass `scope="row"` for a row label (SC 1.3.1). */
export const TableHeaderCell = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  function TableHeaderCell({ scope = "col", className, ...props }, ref) {
    return (
      <th ref={ref} scope={scope} className={cn(scope === "row" ? ROW_HEAD_CLASS : HEAD_CELL_CLASS, className)} {...props} />
    );
  },
);

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  function TableCell({ className, ...props }, ref) {
    return <td ref={ref} className={cn(CELL_CLASS, className)} {...props} />;
  },
);
