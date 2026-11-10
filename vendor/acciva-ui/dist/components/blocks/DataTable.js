"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { useCallback, useDeferredValue, useId, useMemo, useState, useSyncExternalStore, } from "react";
import { HStack } from "../../components/ui/HStack.js";
import { Input } from "../../components/ui/Input.js";
import { VirtualList } from "../../components/ui/VirtualList.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_CARD_HEIGHT = 132;
const DEFAULT_HEIGHT = 480;
const DEFAULT_MIN_COLUMN_WIDTH = 150;
const CARD_BREAKPOINT = "(min-width: 768px)";
const alignClasses = {
    left: "justify-start text-left",
    center: "justify-center text-center",
    right: "justify-end text-right",
};
function subscribeToMediaQuery(query) {
    return (onStoreChange) => {
        const list = window.matchMedia(query);
        list.addEventListener("change", onStoreChange);
        return () => list.removeEventListener("change", onStoreChange);
    };
}
/** Mobile-first: the server snapshot is the card layout, so hydration never widens a row. */
function useIsWideViewport(query) {
    const subscribe = useMemo(() => subscribeToMediaQuery(query), [query]);
    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
function columnText(column, row) {
    if (column.searchValue)
        return column.searchValue(row);
    if (column.sortValue)
        return String(column.sortValue(row));
    return "";
}
function compareValues(a, b) {
    if (typeof a === "number" && typeof b === "number")
        return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}
/** Clamped cells still need the full text for a mouse-hover tooltip since the CSS clamp only hides it visually. */
function clampTitle(column, row) {
    if (!column.wrap || !column.maxLines)
        return undefined;
    return columnText(column, row) || undefined;
}
function renderCellValue(column, row) {
    const content = column.cell(row);
    if (!column.wrap || !column.maxLines)
        return content;
    const clampStyle = {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: column.maxLines,
        overflow: "hidden",
    };
    return (_jsx("span", { className: "block min-w-0 wrap-anywhere whitespace-normal", style: clampStyle, children: content }));
}
export function DataTable({ data, columns, getRowId, caption, height = DEFAULT_HEIGHT, rowHeight = DEFAULT_ROW_HEIGHT, autoRowHeight = false, estimatedCardHeight = DEFAULT_CARD_HEIGHT, searchable = true, searchPlaceholder = "Search table…", initialSort, onRowClick, emptyMessage = "No matching rows", toolbar, className, }) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState(initialSort !== null && initialSort !== void 0 ? initialSort : null);
    const deferredQuery = useDeferredValue(query);
    const wide = useIsWideViewport(CARD_BREAKPOINT);
    const baseId = useId();
    const searchableColumns = useMemo(() => columns.filter((column) => column.searchValue || column.sortValue), [columns]);
    const haystack = useMemo(() => {
        if (searchableColumns.length === 0)
            return null;
        return data.map((row) => searchableColumns.map((column) => columnText(column, row)).join(" ").toLowerCase());
    }, [data, searchableColumns]);
    const filtered = useMemo(() => {
        const needle = deferredQuery.trim().toLowerCase();
        if (!needle || !haystack)
            return data;
        return data.filter((_, index) => haystack[index].includes(needle));
    }, [data, haystack, deferredQuery]);
    const rows = useMemo(() => {
        if (!sort)
            return filtered;
        const column = columns.find((candidate) => candidate.id === sort.columnId);
        const accessor = column === null || column === void 0 ? void 0 : column.sortValue;
        if (!accessor)
            return filtered;
        const factor = sort.direction === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => compareValues(accessor(a), accessor(b)) * factor);
    }, [filtered, sort, columns]);
    const toggleSort = useCallback((columnId) => {
        setSort((current) => {
            if ((current === null || current === void 0 ? void 0 : current.columnId) !== columnId)
                return { columnId, direction: "asc" };
            if (current.direction === "asc")
                return { columnId, direction: "desc" };
            return null;
        });
    }, []);
    const gridTemplate = useMemo(() => columns.map((column) => { var _a, _b; return (_a = column.width) !== null && _a !== void 0 ? _a : `minmax(${(_b = column.minWidthPx) !== null && _b !== void 0 ? _b : DEFAULT_MIN_COLUMN_WIDTH}px, 1fr)`; }).join(" "), [columns]);
    const tableMinWidth = useMemo(() => columns.reduce((total, column) => { var _a; return total + ((_a = column.minWidthPx) !== null && _a !== void 0 ? _a : DEFAULT_MIN_COLUMN_WIDTH); }, 0), [columns]);
    const cardColumns = useMemo(() => columns.filter((column) => !column.hideOnCard), [columns]);
    const primaryColumn = useMemo(() => { var _a; return (_a = columns.find((column) => column.primary)) !== null && _a !== void 0 ? _a : columns[0]; }, [columns]);
    const statusId = `${baseId}-status`;
    const listLabelId = `${baseId}-caption`;
    const emptyState = (_jsx("p", { className: "flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground", children: emptyMessage }));
    const renderTableRow = useCallback((row) => (_jsx(_Fragment, { children: columns.map((column, columnIndex) => {
            var _a;
            return (_jsx("div", { role: "cell", "aria-colindex": columnIndex + 1, title: clampTitle(column, row), className: cn("flex min-w-0 overflow-hidden px-4 text-sm text-foreground", column.wrap ? "items-start wrap-anywhere whitespace-normal py-3" : "items-center truncate", alignClasses[(_a = column.align) !== null && _a !== void 0 ? _a : "left"]), children: renderCellValue(column, row) }, column.id));
        }) })), [columns]);
    const renderCard = useCallback((row) => (_jsx("div", { className: "px-1 pb-3", children: _jsxs(VStack, { spacing: "sm", inset: "lg", className: "rounded-xl border border-border bg-surface", children: [_jsx("span", { className: cn("text-sm font-semibold text-foreground", (primaryColumn === null || primaryColumn === void 0 ? void 0 : primaryColumn.wrap) && "wrap-anywhere"), title: primaryColumn ? clampTitle(primaryColumn, row) : undefined, children: primaryColumn ? renderCellValue(primaryColumn, row) : null }), _jsx("dl", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6", children: cardColumns
                        .filter((column) => column.id !== (primaryColumn === null || primaryColumn === void 0 ? void 0 : primaryColumn.id))
                        .map((column) => (_jsxs(HStack, { spacing: "md", align: "baseline", justify: "between", children: [_jsx("dt", { className: "text-xs font-medium text-muted-foreground", children: column.header }), _jsx("dd", { title: clampTitle(column, row), className: cn("text-sm text-foreground", column.wrap ? "min-w-0 flex-1 wrap-anywhere whitespace-normal text-right" : "truncate"), children: renderCellValue(column, row) })] }, column.id))) })] }) })), [cardColumns, primaryColumn]);
    return (_jsxs(VStack, { as: "section", spacing: "md", className: className, "aria-labelledby": listLabelId, children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("h2", { id: listLabelId, className: "text-base font-semibold text-foreground", children: caption }), _jsxs(HStack, { spacing: "sm", className: "w-full sm:w-72", children: [toolbar, searchable ? (_jsx(Input, { type: "search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: searchPlaceholder, leadingIcon: _jsx(Search, {}), "aria-label": `Search ${caption}`, "aria-describedby": statusId })) : null] })] }), _jsxs("p", { id: statusId, role: "status", "aria-live": "polite", className: "text-xs text-muted-foreground", children: [rows.length, " of ", data.length, " rows"] }), wide ? (
            // The grid is wider than the viewport below `tableMinWidth`, so this wrapper
            // scrolls. SC 2.1.1 needs that scrolling to be reachable without a pointer,
            // and a bare tabindex would announce as an unlabelled stop - hence the named
            // region. Cells hold no focusable content of their own when no column sorts.
            _jsx("div", { className: "focus-ring overflow-x-auto rounded-xl border border-border bg-background", tabIndex: 0, role: "region", "aria-label": `${caption}, scrollable horizontally`, children: _jsxs("div", { role: "table", "aria-label": caption, "aria-rowcount": rows.length + 1, "aria-colcount": columns.length, style: { minWidth: `${tableMinWidth}px` }, children: [_jsx("div", { role: "rowgroup", children: _jsx("div", { role: "row", "aria-rowindex": 1, className: "grid border-b border-border bg-surface", style: { gridTemplateColumns: gridTemplate }, children: columns.map((column, columnIndex) => {
                                    var _a;
                                    const sortable = column.sortable !== false && Boolean(column.sortValue);
                                    const active = (sort === null || sort === void 0 ? void 0 : sort.columnId) === column.id;
                                    return (_jsx("div", { role: "columnheader", "aria-colindex": columnIndex + 1, "aria-sort": active ? ((sort === null || sort === void 0 ? void 0 : sort.direction) === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined, className: cn("flex items-center", alignClasses[(_a = column.align) !== null && _a !== void 0 ? _a : "left"]), children: sortable ? (_jsxs("button", { type: "button", onClick: () => toggleSort(column.id), className: "focus-ring flex h-11 w-full items-center gap-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors motion-feedback hover:text-foreground active:text-foreground", children: [column.header, active ? ((sort === null || sort === void 0 ? void 0 : sort.direction) === "asc" ? (_jsx(ArrowUp, { className: "size-3.5 text-primary-800 dark:text-primary-300" })) : (_jsx(ArrowDown, { className: "size-3.5 text-primary-800 dark:text-primary-300" }))) : (_jsx(ChevronsUpDown, { className: "size-3.5 opacity-50" }))] })) : (_jsx("span", { className: "flex h-11 w-full items-center px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: column.header })) }, column.id));
                                }) }) }), _jsx(VirtualList, { items: rows, itemHeight: rowHeight, dynamic: autoRowHeight, height: height, role: "rowgroup", itemRole: "row", interactive: Boolean(onRowClick), label: caption, getItemKey: getRowId, onItemSelect: onRowClick, renderItem: renderTableRow, emptyState: emptyState, itemStyle: { display: "grid", gridTemplateColumns: gridTemplate }, itemClassName: cn("border-b border-border transition-colors motion-feedback data-[active]:bg-primary-500/8 dark:data-[active]:bg-primary-400/15 hover:bg-primary-500/8 dark:hover:bg-primary-400/15 active:bg-primary-500/15 dark:active:bg-primary-400/25", onRowClick && "cursor-pointer") })] }) })) : (_jsx(VirtualList, { items: rows, itemHeight: estimatedCardHeight, dynamic: true, height: height, role: "list", itemRole: "listitem", interactive: Boolean(onRowClick), label: caption, getItemKey: getRowId, onItemSelect: onRowClick, renderItem: renderCard, emptyState: emptyState, itemClassName: onRowClick ? "cursor-pointer" : undefined }))] }));
}
