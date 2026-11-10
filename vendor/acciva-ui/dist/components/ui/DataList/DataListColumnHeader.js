import { jsx as _jsx } from "react/jsx-runtime";
import { columnCellClass } from "./utils.js";
// Visual only: each cell announces its header.
export function DataListColumnHeader({ columns, template }) {
    return (_jsx("div", { "aria-hidden": "true", className: "grid items-center gap-3 px-1 text-xs font-medium text-muted-foreground", style: { gridTemplateColumns: template }, children: columns.map((column) => (_jsx("div", { className: columnCellClass(column), children: column.header }, column.key))) }));
}
