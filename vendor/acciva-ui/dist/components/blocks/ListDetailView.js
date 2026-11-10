"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/blocks/DataTable.js";
import { Button } from "../../components/ui/Button.js";
import { Drawer } from "../../components/ui/Drawer.js";
import { Heading } from "../../components/ui/Heading.js";
import { HStack } from "../../components/ui/HStack.js";
import { Text } from "../../components/ui/Text.js";
import { VirtualList } from "../../components/ui/VirtualList.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function ListDetailView({ items, mode = "table", columns = [], renderListItem, getItemKey, caption, selectedItem, onSelectItem, renderDetail, detailTitle, searchable, searchPlaceholder, height, rowHeight = 60, emptyMessage, toolbar, className, }) {
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
    const isTableMode = mode === "table" && columns.length > 0;
    return (_jsxs(VStack, { spacing: "md", className: cn("w-full", className), children: [isTableMode ? (_jsx(DataTable, { data: items, columns: columns, getRowId: getItemKey, caption: caption, height: height, searchable: searchable, searchPlaceholder: searchPlaceholder, onRowClick: (row) => handleSelect(row), emptyMessage: emptyMessage, toolbar: toolbar })) : (_jsxs(VStack, { spacing: "sm", className: "w-full", children: [toolbar, items.length === 0 ? (_jsx("div", { className: "rounded-lg border border-border bg-surface p-8 text-center", children: _jsx(Text, { variant: "muted", children: emptyMessage !== null && emptyMessage !== void 0 ? emptyMessage : "No items found" }) })) : (_jsx("div", { className: "rounded-lg border border-border bg-surface", children: _jsx(VirtualList, { items: items, height: height !== null && height !== void 0 ? height : 480, itemHeight: rowHeight, getItemKey: getItemKey, "aria-label": caption, role: "listbox", renderItem: (item, state) => {
                                const isSelected = currentItem !== null &&
                                    currentItem !== undefined &&
                                    getItemKey(currentItem, -1) === getItemKey(item, state.index);
                                return (_jsx("div", { role: "option", "aria-selected": isSelected, tabIndex: 0, onClick: () => handleSelect(item), onKeyDown: (e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleSelect(item);
                                        }
                                    }, className: cn("focus-ring cursor-pointer border-b border-border transition-colors motion-feedback last:border-b-0", isSelected ? "bg-primary-500/10 active:bg-primary-500/15" : "hover:bg-elevation-2 active:bg-elevation-3"), children: renderListItem ? (renderListItem(item, state.index, isSelected)) : (_jsx("div", { className: "p-4", children: _jsx(Text, { children: String(getItemKey(item, state.index)) }) })) }, getItemKey(item, state.index)));
                            } }) }))] })), _jsx(Drawer, { open: currentItem !== null && currentItem !== undefined, onOpenChange: (open) => {
                    if (!open) {
                        handleSelect(null);
                    }
                }, side: "right", "aria-label": typeof detailTitle === "string"
                    ? detailTitle
                    : "Detail panel", children: currentItem !== null && currentItem !== undefined && (_jsxs(VStack, { spacing: "lg", inset: "lg", className: "h-full", children: [_jsxs(HStack, { justify: "between", align: "center", className: "border-b border-border pb-4", children: [_jsx(Heading, { level: 2, size: "lg", children: typeof detailTitle === "function"
                                        ? detailTitle(currentItem)
                                        : detailTitle !== null && detailTitle !== void 0 ? detailTitle : "Details" }), _jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: "Close detail panel", onClick: () => handleSelect(null), className: "touch-target-44", children: _jsx(X, { "aria-hidden": "true", className: "size-5" }) })] }), _jsx("div", { className: "flex-1 overflow-auto", tabIndex: 0, role: "region", "aria-label": "Detail content", children: renderDetail(currentItem, () => handleSelect(null)) })] })) })] }));
}
