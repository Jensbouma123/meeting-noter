import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { Tooltip } from "../../ui/Tooltip/index.js";
import { VStack } from "../../ui/VStack.js";
import { SIDEBAR_RAIL_HEIGHT, STICKY_PANEL_TOP } from "../../../lib/layout-tokens.js";
import { ICON_SIZE_CLASS } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { SidebarGlyph, SidebarReorderMenu } from "./SidebarParts.js";
import { resolveActive } from "./sidebarHelpers.js";
export function SidebarRail({ items, pathname, className, railRefs, onReorder, onMove, onListKeyDown, }) {
    return (_jsx("aside", { className: cn("hidden w-20 shrink-0 border-r border-border bg-surface lg:sticky lg:block lg:overflow-y-auto", STICKY_PANEL_TOP, SIDEBAR_RAIL_HEIGHT, className), children: _jsx(VStack, { as: "nav", "aria-label": "Primary navigation", spacing: "sm", align: "center", inset: "md", className: "h-full", children: _jsx(VStack, { as: "ul", spacing: "sm", align: "center", className: "w-full", onKeyDown: onListKeyDown, children: items.map((item, index) => {
                    const active = resolveActive(pathname, item);
                    return (_jsxs("li", { className: "w-full", children: [_jsx(Tooltip, { content: item.label, side: "right", children: _jsx(Link, { ref: (node) => {
                                        railRefs.current[index] = node;
                                    }, href: item.href, "aria-label": item.label, "aria-current": active ? "page" : undefined, className: cn("focus-ring mx-auto flex h-11 w-11 items-center justify-center rounded-lg transition-colors motion-feedback", active
                                        ? "bg-primary-500/15 text-primary-800 dark:text-primary-300"
                                        : "text-foreground hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground"), children: _jsx(SidebarGlyph, { icon: item.icon, className: cn(ICON_SIZE_CLASS.lg, "shrink-0") }) }) }), onReorder && items.length > 1 && (_jsx("div", { className: "mt-2 flex justify-center", children: _jsx(SidebarReorderMenu, { label: item.label, index: index, total: items.length, onMove: onMove }) }))] }, item.href));
                }) }) }) }));
}
