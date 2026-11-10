import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { VirtualList } from "../ui/VirtualList/index.js";
import { cn } from "../../lib/utils.js";
import { DataTableHeaderRow, renderTableRowCells } from "./dataTableParts.js";
export function DataTableWide({ caption, columns, rows, getRowId, gridTemplate, tableMinWidth, sort, toggleSort, rowHeight, autoRowHeight, height, onRowClick, emptyState, }) {
    const renderRow = useCallback((row) => renderTableRowCells(row, columns), [columns]);
    return (
    // The grid is wider than the viewport below `tableMinWidth`, so this wrapper
    // scrolls. SC 2.1.1 needs that scrolling to be reachable without a pointer,
    // and a bare tabindex would announce as an unlabelled stop - hence the named
    // region. Cells hold no focusable content of their own when no column sorts.
    _jsx("div", { className: "focus-ring overflow-x-auto rounded-xl border border-border bg-background", tabIndex: 0, role: "region", "aria-label": `${caption}, scrollable horizontally`, children: _jsxs("div", { role: "table", "aria-label": caption, "aria-rowcount": rows.length + 1, "aria-colcount": columns.length, style: { minWidth: `${tableMinWidth}px` }, children: [_jsx("div", { role: "rowgroup", children: _jsx(DataTableHeaderRow, { columns: columns, gridTemplate: gridTemplate, sort: sort, toggleSort: toggleSort }) }), _jsx(VirtualList, { items: rows, itemHeight: rowHeight, dynamic: autoRowHeight, height: height, role: "rowgroup", itemRole: "row", interactive: Boolean(onRowClick), label: caption, getItemKey: getRowId, onItemSelect: onRowClick, renderItem: renderRow, emptyState: emptyState, itemStyle: { display: "grid", gridTemplateColumns: gridTemplate }, itemClassName: cn("border-b border-border transition-colors motion-feedback data-[active]:bg-primary-500/8 dark:data-[active]:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15 active:bg-primary-500/15 dark:active:bg-primary-400/25", onRowClick && "cursor-pointer") })] }) }));
}
