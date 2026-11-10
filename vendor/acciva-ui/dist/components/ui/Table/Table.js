import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { BODY_ROW_CLASS, CELL_CLASS, HEAD_CELL_CLASS, HEAD_ROW_CLASS, ROW_HEAD_CLASS, TABLE_CLASS } from "./classes.js";
/**
 * A native `<table>` inside a focusable, labelled scroll region: keyboard users can scroll it
 * (SC 2.1.1) and assistive tech announces it (SC 1.3.1).
 */
export const Table = forwardRef(function Table({ label, density = "comfortable", stickyFirstColumn = false, minWidthClassName, className, children, ...props }, ref) {
    return (_jsx("div", { role: "region", tabIndex: 0, "aria-label": label, className: "overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-focus-ring", children: _jsx("table", { ref: ref, "data-compact": density === "compact" || undefined, "data-sticky-first": stickyFirstColumn || undefined, className: cn(TABLE_CLASS, minWidthClassName, className), ...props, children: children }) }));
});
export const TableHead = forwardRef(function TableHead({ className, ...props }, ref) {
    return _jsx("thead", { ref: ref, className: cn("text-xs", className), ...props });
});
export const TableBody = forwardRef(function TableBody(props, ref) {
    return _jsx("tbody", { ref: ref, ...props });
});
/** `header` marks a row inside `TableHead` so it gets the header surface. */
export const TableRow = forwardRef(function TableRow({ header = false, className, ...props }, ref) {
    return _jsx("tr", { ref: ref, className: cn(header ? HEAD_ROW_CLASS : BODY_ROW_CLASS, className), ...props });
});
/** Header cell. `scope` defaults to `col`; pass `scope="row"` for a row label (SC 1.3.1). */
export const TableHeaderCell = forwardRef(function TableHeaderCell({ scope = "col", className, ...props }, ref) {
    return (_jsx("th", { ref: ref, scope: scope, className: cn(scope === "row" ? ROW_HEAD_CLASS : HEAD_CELL_CLASS, className), ...props }));
});
export const TableCell = forwardRef(function TableCell({ className, ...props }, ref) {
    return _jsx("td", { ref: ref, className: cn(CELL_CLASS, className), ...props });
});
