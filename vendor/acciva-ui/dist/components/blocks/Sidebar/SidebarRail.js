import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { useRef } from "react";
import { Tooltip } from "../../ui/Tooltip/index.js";
import { VStack } from "../../ui/VStack.js";
import { SIDEBAR_RAIL_HEIGHT, STICKY_PANEL_TOP } from "../../../lib/layout-tokens.js";
import { ListItem } from "../../ui/ListItem.js";
import { ICON_SIZE_CLASS } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { SidebarGlyph, SidebarReorderMenu } from "./SidebarParts.js";
import { useSidebarListKeys } from "./useSidebarListKeys.js";
import { resolveActive } from "./sidebarHelpers.js";
export function SidebarRail({ items, pathname, className, railRefs, onReorder, onMove, queueFocus, }) {
    const listRef = useRef(null);
    const onListKeyDown = useSidebarListKeys({ containerRef: listRef, list: "rail", refs: railRefs, count: items.length, canReorder: !!onReorder, queueFocus, move: onMove });
    return (_jsx("aside", { className: cn("hidden w-20 shrink-0 border-r border-border bg-surface lg:sticky lg:block lg:overflow-y-auto", STICKY_PANEL_TOP, SIDEBAR_RAIL_HEIGHT, className), children: _jsx(VStack, { as: "nav", "aria-label": "Primary navigation", spacing: "sm", align: "center", inset: "md", className: "h-full", children: _jsx(VStack, { as: "ul", spacing: "sm", align: "center", className: "w-full", ref: listRef, onKeyDown: onListKeyDown, children: items.map((item, index) => {
                    const active = resolveActive(pathname, item);
                    return (_jsxs("li", { className: "w-full", children: [_jsx(Tooltip, { content: item.label, side: "right", children: _jsx(ListItem, { asChild: true, density: "rail", title: item.label, selected: active, leading: _jsx(SidebarGlyph, { icon: item.icon, className: cn(ICON_SIZE_CLASS.lg, "shrink-0") }), ref: (node) => {
                                        railRefs.current[index] = node;
                                    }, className: "mx-auto", children: _jsx(Link, { href: item.href }) }) }), onReorder && items.length > 1 && (_jsx("div", { className: "mt-2 flex justify-center", children: _jsx(SidebarReorderMenu, { label: item.label, index: index, total: items.length, onMove: onMove }) }))] }, item.href));
                }) }) }) }));
}
