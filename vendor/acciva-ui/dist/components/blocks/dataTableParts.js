import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { HStack } from "../ui/HStack.js";
import { Text } from "../ui/Text.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
import { alignClasses } from "./dataTableConstants.js";
import { clampTitle, renderCellValue } from "./dataTableHelpers.js";
export function renderTableRowCells(row, columns) {
    return (_jsx(_Fragment, { children: columns.map((column, columnIndex) => (_jsx("div", { role: "cell", "aria-colindex": columnIndex + 1, title: clampTitle(column, row), className: cn("flex min-w-0 overflow-hidden px-4 text-sm text-foreground", column.wrap ? "items-start wrap-anywhere whitespace-normal py-3" : "items-center truncate", alignClasses[column.align ?? "left"]), children: renderCellValue(column, row) }, column.id))) }));
}
export function DataTableHeaderRow({ columns, gridTemplate, sort, toggleSort }) {
    return (_jsx("div", { role: "row", "aria-rowindex": 1, className: "grid border-b border-border bg-surface", style: { gridTemplateColumns: gridTemplate }, children: columns.map((column, columnIndex) => {
            const sortable = column.sortable !== false && Boolean(column.sortValue);
            const active = sort?.columnId === column.id;
            return (_jsx("div", { role: "columnheader", "aria-colindex": columnIndex + 1, "aria-sort": active ? (sort?.direction === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined, className: cn("flex items-center", alignClasses[column.align ?? "left"]), children: sortable ? (_jsxs("button", { type: "button", onClick: () => toggleSort(column.id), className: "focus-ring flex h-11 w-full items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors motion-feedback hover:text-foreground active:text-foreground", children: [column.header, active ? (sort?.direction === "asc" ? (_jsx(ArrowUp, { className: "size-3.5 text-primary-800 dark:text-primary-300" })) : (_jsx(ArrowDown, { className: "size-3.5 text-primary-800 dark:text-primary-300" }))) : (_jsx(ChevronsUpDown, { className: "size-3.5 opacity-50" }))] })) : (_jsx(Text, { as: "span", size: "xs", weight: "semibold", variant: "muted", className: "flex h-11 w-full items-center px-4 uppercase tracking-wide", children: column.header })) }, column.id));
        }) }));
}
export function renderDataTableCard(row, cardColumns, primaryColumn) {
    return (_jsx("div", { className: "px-1 pb-3", children: _jsxs(VStack, { spacing: "sm", inset: "lg", className: "rounded-xl border border-border bg-surface", children: [_jsx(Text, { as: "span", size: "sm", weight: "semibold", className: cn(primaryColumn?.wrap && "wrap-anywhere"), title: primaryColumn ? clampTitle(primaryColumn, row) : undefined, children: primaryColumn ? renderCellValue(primaryColumn, row) : null }), _jsx("dl", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6", children: cardColumns
                        .filter((column) => column.id !== primaryColumn?.id)
                        .map((column) => (_jsxs(HStack, { spacing: "md", align: "baseline", justify: "between", children: [_jsx("dt", { className: "text-xs font-medium text-muted-foreground", children: column.header }), _jsx("dd", { title: clampTitle(column, row), className: cn("text-sm text-foreground", column.wrap ? "min-w-0 flex-1 wrap-anywhere whitespace-normal text-right" : "truncate"), children: renderCellValue(column, row) })] }, column.id))) })] }) }));
}
