"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { DataTable } from "./DataTable.js";
import { DEFAULT_HEIGHT } from "./dataTableConstants.js";
import { Card } from "../ui/Card/index.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Text } from "../ui/Text.js";
import { VirtualList } from "../ui/VirtualList/index.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
import { ListDetailDrawer } from "./ListDetailView/ListDetailViewDrawer.js";
export function ListDetailView({ items, mode = "table", columns = [], renderListItem, getItemKey, caption, selectedItem, onSelectItem, renderDetail, detailTitle, searchable, searchPlaceholder, height, rowHeight = 60, emptyMessage, toolbar, className, arrowHint, }) {
    const [internalSelected, setInternalSelected] = useState(null);
    const isControlled = selectedItem !== undefined;
    const currentItem = isControlled ? selectedItem : internalSelected;
    const handleSelect = (item) => {
        if (onSelectItem) {
            onSelectItem(item);
        }
        if (!isControlled) {
            setInternalSelected(item);
        }
    };
    const isSelectedItem = (item, index) => currentItem !== null && currentItem !== undefined && getItemKey(currentItem, -1) === getItemKey(item, index);
    const isTableMode = mode === "table" && columns.length > 0;
    return (_jsxs(VStack, { spacing: "md", className: cn("w-full", className), children: [isTableMode ? (_jsx(DataTable, { data: items, columns: columns, getRowId: getItemKey, caption: caption, height: height, searchable: searchable, searchPlaceholder: searchPlaceholder, onRowClick: (row) => handleSelect(row), emptyMessage: emptyMessage, toolbar: toolbar })) : (_jsxs(VStack, { spacing: "sm", className: "w-full", children: [toolbar, items.length === 0 ? (_jsx(Card, { padding: "lg", children: _jsx(EmptyState, { title: emptyMessage ?? "No items found", size: "sm" }) })) : (_jsx(Card, { padding: "none", children: _jsx(VirtualList, { items: items, height: height ?? DEFAULT_HEIGHT, itemHeight: rowHeight, getItemKey: getItemKey, "aria-label": caption, arrowHint: arrowHint, role: "listbox", itemRole: "option", itemClassName: "data-[active]:bg-elevation-2", isItemSelected: (item, index) => isSelectedItem(item, index), onItemSelect: (item) => handleSelect(item), renderItem: (item, state) => {
                                const isSelected = state.selected;
                                return (_jsx("div", { className: cn("cursor-pointer border-b border-border transition-colors motion-feedback last:border-b-0", isSelected ? "bg-primary-500/10 active:bg-primary-500/15" : "hover:bg-elevation-2 active:bg-elevation-3"), children: renderListItem ? (renderListItem(item, state.index, isSelected)) : (_jsx("div", { className: "p-4", children: _jsx(Text, { children: String(getItemKey(item, state.index)) }) })) }, getItemKey(item, state.index)));
                            } }) }))] })), _jsx(ListDetailDrawer, { currentItem: currentItem, detailTitle: detailTitle, renderDetail: renderDetail, onClose: () => handleSelect(null) })] }));
}
