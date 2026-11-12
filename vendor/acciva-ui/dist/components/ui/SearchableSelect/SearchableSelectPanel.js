import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { VirtualList } from "../VirtualList/index.js";
import { cn } from "../../../lib/utils.js";
import { HStack } from "../HStack.js";
import { OptionAdornment, anchorNameFor } from "./SearchableSelectParts.js";
function highlightMatch(label, query) {
    if (!query)
        return label;
    const start = label.toLowerCase().indexOf(query);
    if (start === -1)
        return label;
    const end = start + query.length;
    return (_jsxs(_Fragment, { children: [label.slice(0, start), _jsx("mark", { className: "bg-primary-500/15 text-primary-900 dark:bg-primary-400/25 dark:text-primary-200 rounded-xs px-0.5 font-semibold", children: label.slice(start, end) }), label.slice(end)] }));
}
export function SearchableSelectPanel({ items, value, query, activeIndex, optionHeight, maxListHeight, listRef, listboxId, labelId, optionId, emptyMessage, onCommit, onHover, }) {
    const listHeight = Math.min(maxListHeight, Math.max(optionHeight, items.length * optionHeight));
    const panelRef = useRef(null);
    // Top layer, like Select: no `overflow: hidden` ancestor clips it, and `.select-list` bounds it to
    // the side it opened. Focus stays on the input (`manual`); the list shrinks (flex) to that bound.
    useEffect(() => {
        const panel = panelRef.current;
        if (panel?.showPopover && !panel.matches(":popover-open"))
            panel.showPopover();
    }, []);
    return (_jsx("div", { ref: panelRef, popover: "manual", style: { positionAnchor: anchorNameFor(listboxId), width: "anchor-size(width)", "--select-list-cap": "100%" }, className: "select-list flex flex-col overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg animate-fade-in", children: _jsx(VirtualList, { items: items, itemHeight: optionHeight, height: listHeight, listRef: listRef, role: "listbox", itemRole: "option", interactive: false, labelledBy: labelId, getItemKey: (option) => option.value, getItemId: optionId, isItemDisabled: (option) => Boolean(option.disabled), isItemSelected: (option) => option.value === value, onItemSelect: (_, index) => onCommit(index), className: "focus:outline-none", emptyState: _jsx("p", { className: "flex h-full items-center justify-center px-3 text-sm text-muted-foreground", children: emptyMessage }), renderItem: (option, state) => (_jsxs(HStack, { justify: "between", spacing: "sm", className: cn("h-full rounded-md px-3 text-sm transition-colors motion-feedback", option.value === value && "bg-primary-500/10 font-semibold text-primary-950 dark:bg-primary-400/15 dark:text-primary-100 active:bg-primary-500/20", state.index === activeIndex && !option.disabled && "bg-primary-500/15 text-primary-950 dark:bg-primary-400/25 dark:text-primary-50 active:bg-primary-500/25", option.value !== value && state.index !== activeIndex && "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4", state.disabled ? "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent" : "cursor-pointer"), onMouseEnter: () => {
                    if (!state.disabled)
                        onHover(state.index);
                }, children: [_jsxs(HStack, { as: "span", spacing: "sm", className: "min-w-0", children: [_jsx(OptionAdornment, { icon: option.icon }), _jsx("span", { className: "truncate", children: highlightMatch(option.label, query) })] }), state.selected ? _jsx(Check, { className: "size-4 shrink-0 text-primary-600 dark:text-primary-400" }) : null] })) }) }));
}
