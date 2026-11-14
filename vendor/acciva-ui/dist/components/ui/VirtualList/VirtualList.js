"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { ArrowHint } from "../../../lib/ArrowHint.js";
import { cn } from "../../../lib/utils.js";
import { ACTIVEDESCENDANT_ROLES } from "./constants.js";
import { useVirtualListModel } from "./useVirtualListModel.js";
import { VirtualListRows, VirtualListScrollToTop } from "./VirtualListParts.js";
export function VirtualList(props) {
    const scrollRef = useRef(null);
    const { items, renderItem, dynamic = false, getItemKey, isItemSelected, onItemSelect, interactive = true, role = "list", itemRole = "listitem", label, labelledBy, describedBy, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, className, itemClassName, itemStyle, emptyState, } = props;
    const model = useVirtualListModel(props, scrollRef);
    const { count, layout, range, hint } = model;
    const activeRendered = model.resolvedActiveIndex >= range.start && model.resolvedActiveIndex < range.end;
    const scrollToTop = model.scrollToTopEnabled && count > 0 && (_jsx(VirtualListScrollToTop, { options: model.scrollToTopOptions, visible: model.isScrollToTopVisible, fullWidth: model.isScrollToTopFullWidth, onClick: model.handleScrollToTop }));
    const list = (_jsxs("div", { ref: scrollRef, onScroll: model.handleScroll, onKeyDown: interactive ? model.handleKeyDown : undefined, ...hint.groupProps, 
        // The root scrolls whatever `interactive` says, so it is always a tab stop:
        // SC 2.1.1 Keyboard needs a scroll container to be reachable and driveable
        // without a pointer, and arrow keys only scroll an element that can hold focus.
        // `interactive` still gates the active-descendant navigation layered on top.
        tabIndex: 0, role: role, "aria-label": ariaLabel ?? label, "aria-labelledby": ariaLabelledBy ?? labelledBy, "aria-describedby": hint.describedBy(ariaDescribedBy ?? describedBy), "aria-activedescendant": interactive && count > 0 && ACTIVEDESCENDANT_ROLES.has(role) && activeRendered ? model.itemId(model.resolvedActiveIndex) : undefined, className: cn("focus-ring relative overflow-y-auto overflow-x-hidden", className), style: model.containerStyle, children: [count === 0 ? (emptyState) : (_jsx("div", { role: "presentation", style: { position: "relative", height: layout.total, width: "100%" }, children: _jsx(VirtualListRows, { items: items, range: range, count: count, resolvedActiveIndex: model.resolvedActiveIndex, interactive: interactive, disabledAt: model.disabledAt, isItemSelected: isItemSelected, dynamic: dynamic, offsetAt: model.offsetAt, sizeAt: model.sizeAt, getItemKey: getItemKey, itemId: model.itemId, registerItem: model.registerItem, itemRole: itemRole, itemClassName: itemClassName, itemStyle: itemStyle, onItemSelect: onItemSelect, renderItem: renderItem }) })), hint.visible && (_jsx("div", { role: "presentation", className: "sticky bottom-0 h-0", children: _jsx(ArrowHint, { id: hint.id, text: hint.text, visible: true, className: "top-auto bottom-1 left-2" }) }))] }));
    // The button is a sibling of the role container (SC 1.3.1: list/listbox/rowgroup
    // may only own listitem/option/row), pinned to the viewport bottom by absolute position.
    return scrollToTop ? (_jsxs("div", { className: "relative", children: [list, scrollToTop] })) : (list);
}
