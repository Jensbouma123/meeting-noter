import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HStack } from "../HStack.js";
import { DataListSearchField } from "./DataListSearchField.js";
import { DataListSelectionBar } from "./DataListSelectionBar.js";
import { DataListSortControl } from "./DataListSortControl.js";
export function DataListToolbar({ props, view }) {
    const { searchable = false, sortable = false, sortOptions, toolbar, selectionMode = "none", showSelectionToolbar = true, searchPlaceholder = "Search list...", } = props;
    return (_jsxs(HStack, { spacing: "md", wrap: true, justify: "between", children: [_jsxs("div", { className: "flex flex-1 flex-wrap items-center gap-3 min-w-60", children: [searchable && (_jsx(DataListSearchField, { inputId: view.searchInputId, query: view.activeSearchQuery, placeholder: searchPlaceholder, statusRegionId: view.statusRegionId, onQueryChange: view.handleSearchChange })), sortable && sortOptions && sortOptions.length > 0 && (_jsx(DataListSortControl, { id: `${view.generatedId}-sort`, options: sortOptions, activeKey: view.activeSortKey, direction: view.activeSortDirection, onSortChange: view.handleSortChange, onToggleDirection: view.toggleSortDirection })), toolbar] }), selectionMode === "multiple" && showSelectionToolbar && (_jsx(DataListSelectionBar, { selectedCount: view.selectedCount, itemCount: view.processedItems.length, onSelectAll: view.handleSelectAll, onClear: view.handleClearSelection }))] }));
}
