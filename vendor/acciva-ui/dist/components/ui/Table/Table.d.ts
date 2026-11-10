import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
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
export declare const Table: import("react").ForwardRefExoticComponent<TableProps & import("react").RefAttributes<HTMLTableElement>>;
export declare const TableHead: import("react").ForwardRefExoticComponent<HTMLAttributes<HTMLTableSectionElement> & import("react").RefAttributes<HTMLTableSectionElement>>;
export declare const TableBody: import("react").ForwardRefExoticComponent<HTMLAttributes<HTMLTableSectionElement> & import("react").RefAttributes<HTMLTableSectionElement>>;
/** `header` marks a row inside `TableHead` so it gets the header surface. */
export declare const TableRow: import("react").ForwardRefExoticComponent<HTMLAttributes<HTMLTableRowElement> & {
    header?: boolean;
} & import("react").RefAttributes<HTMLTableRowElement>>;
/** Header cell. `scope` defaults to `col`; pass `scope="row"` for a row label (SC 1.3.1). */
export declare const TableHeaderCell: import("react").ForwardRefExoticComponent<ThHTMLAttributes<HTMLTableCellElement> & import("react").RefAttributes<HTMLTableCellElement>>;
export declare const TableCell: import("react").ForwardRefExoticComponent<TdHTMLAttributes<HTMLTableCellElement> & import("react").RefAttributes<HTMLTableCellElement>>;
