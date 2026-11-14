import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { VirtualList } from "../VirtualList/index.js";
import { useOpenSide } from "../Select/useOpenSide.js";
import { anchorNameFor } from "./parts.js";
/**
 * The popup shared by SearchableSelect and SearchCombobox: a `popover="manual"` top-layer panel
 * (`.select-list`) anchored to the field, holding a virtualized listbox. Focus stays on the input.
 */
export function ComboboxPanel({ items, selectedValue = null, optionHeight, maxListHeight, listRef, listboxId, labelId, listLabel, optionId, emptyMessage, onCommit, renderRow, }) {
    const listHeight = Math.min(maxListHeight, Math.max(optionHeight, items.length * optionHeight));
    const panelRef = useRef(null);
    useOpenSide(panelRef);
    // Top layer: no `overflow: hidden` ancestor clips it, and `.select-list` bounds it to the side it
    // opened. The list shrinks (flex) to that bound, so a short viewport never pushes it off-screen.
    useEffect(() => {
        const panel = panelRef.current;
        if (panel?.showPopover && !panel.matches(":popover-open"))
            panel.showPopover();
    }, []);
    return (_jsx("div", { ref: panelRef, popover: "manual", 
        // Option clicks must not blur the input, or commit()'s refocus reopens the list.
        onMouseDown: (event) => event.preventDefault(), style: { positionAnchor: anchorNameFor(listboxId), width: "anchor-size(width)", "--select-list-cap": "100%" }, className: "select-list flex flex-col overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in", children: _jsx(VirtualList, { items: items, itemHeight: optionHeight, height: listHeight, listRef: listRef, role: "listbox", itemRole: "option", interactive: false, "aria-labelledby": labelId, "aria-label": labelId ? undefined : listLabel, getItemKey: (option) => option.value, getItemId: optionId, isItemDisabled: (option) => Boolean(option.disabled), isItemSelected: (option) => option.value === selectedValue, onItemSelect: (_, index) => onCommit(index), className: "focus:outline-none", emptyState: _jsx("p", { className: "flex h-full items-center justify-center px-3 text-sm text-muted-foreground", children: emptyMessage }), renderItem: renderRow }) }));
}
