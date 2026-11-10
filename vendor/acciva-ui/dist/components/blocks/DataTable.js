"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from "lucide-react";
import { useCallback, useId } from "react";
import { Heading } from "../ui/Heading/index.js";
import { HStack } from "../ui/HStack.js";
import { Input } from "../ui/Input/index.js";
import { Stack } from "../ui/Stack/index.js";
import { Text } from "../ui/Text.js";
import { VirtualList } from "../ui/VirtualList/index.js";
import { VStack } from "../ui/VStack.js";
import { CARD_BREAKPOINT, DEFAULT_CARD_HEIGHT, DEFAULT_HEIGHT, DEFAULT_ROW_HEIGHT } from "./dataTableConstants.js";
import { renderDataTableCard } from "./dataTableParts.js";
import { DataTableWide } from "./dataTableWide.js";
import { useDataTableLayout } from "./useDataTableLayout.js";
import { useDataTableRows } from "./useDataTableRows.js";
import { useIsWideViewport } from "./useIsWideViewport.js";
export function DataTable({ data, columns, getRowId, caption, height = DEFAULT_HEIGHT, rowHeight = DEFAULT_ROW_HEIGHT, autoRowHeight = false, estimatedCardHeight = DEFAULT_CARD_HEIGHT, searchable = true, searchPlaceholder = "Search table…", initialSort, onRowClick, emptyMessage = "No matching rows", toolbar, className, }) {
    const { query, setQuery, sort, rows, toggleSort } = useDataTableRows(data, columns, initialSort);
    const wide = useIsWideViewport(CARD_BREAKPOINT);
    const baseId = useId();
    const { gridTemplate, tableMinWidth, cardColumns, primaryColumn } = useDataTableLayout(columns);
    const statusId = `${baseId}-status`;
    const listLabelId = `${baseId}-caption`;
    const emptyState = (_jsx(Text, { as: "p", size: "sm", variant: "muted", align: "center", className: "flex h-full items-center justify-center px-4", children: emptyMessage }));
    const renderCard = useCallback((row) => renderDataTableCard(row, cardColumns, primaryColumn), [cardColumns, primaryColumn]);
    return (_jsxs(VStack, { as: "section", spacing: "md", className: className, "aria-labelledby": listLabelId, children: [_jsxs(Stack, { direction: { base: "vertical", sm: "horizontal" }, spacing: "md", justify: "between", children: [_jsx(Heading, { level: 2, size: "md", weight: "semibold", id: listLabelId, children: caption }), _jsxs(HStack, { spacing: "sm", className: "w-full sm:w-72", children: [toolbar, searchable ? (_jsx(Input, { type: "search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: searchPlaceholder, leadingIcon: _jsx(Search, {}), "aria-label": `Search ${caption}`, "aria-describedby": statusId })) : null] })] }), _jsxs(Text, { as: "p", id: statusId, role: "status", "aria-live": "polite", size: "xs", variant: "muted", children: [rows.length, " of ", data.length, " rows"] }), wide ? (_jsx(DataTableWide, { caption: caption, columns: columns, rows: rows, getRowId: getRowId, gridTemplate: gridTemplate, tableMinWidth: tableMinWidth, sort: sort, toggleSort: toggleSort, rowHeight: rowHeight, autoRowHeight: autoRowHeight, height: height, onRowClick: onRowClick, emptyState: emptyState })) : (_jsx(VirtualList, { items: rows, itemHeight: estimatedCardHeight, dynamic: true, height: height, role: "list", itemRole: "listitem", interactive: Boolean(onRowClick), label: caption, getItemKey: getRowId, onItemSelect: onRowClick, renderItem: renderCard, emptyState: emptyState, itemClassName: onRowClick ? "cursor-pointer" : undefined }))] }));
}
