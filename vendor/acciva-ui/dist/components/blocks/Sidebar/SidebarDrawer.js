import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { Drawer } from "../../ui/Drawer/index.js";
import { VStack } from "../../ui/VStack.js";
import { ICON_SIZE_CLASS } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { SidebarGlyph, SidebarReorderMenu } from "./SidebarParts.js";
import { resolveActive } from "./sidebarHelpers.js";
export function SidebarDrawer({ items, pathname, mobileOpen, onMobileClose, drawerRefs, onListKeyDown, onReorder, onMove, }) {
    return (_jsx(Drawer, { open: mobileOpen, onOpenChange: (next) => {
            if (!next)
                onMobileClose();
        }, side: "left", defaultSize: "16rem", swipeToDismiss: false, "aria-label": "Mobile navigation", className: "lg:hidden", children: _jsx(VStack, { as: "nav", "aria-label": "Primary navigation", spacing: "sm", inset: "md", className: "h-full", children: _jsx(VStack, { as: "ul", spacing: "sm", onKeyDown: onListKeyDown, children: items.map((item, index) => {
                    const active = resolveActive(pathname, item);
                    return (_jsxs("li", { className: "flex items-center gap-1", children: [_jsxs(Link, { ref: (node) => {
                                    drawerRefs.current[index] = node;
                                }, href: item.href, onClick: onMobileClose, "aria-current": active ? "page" : undefined, className: cn("focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-feedback", active
                                    ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                                    : "text-foreground hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground"), children: [_jsx(SidebarGlyph, { icon: item.icon, className: cn(ICON_SIZE_CLASS.lg, "shrink-0") }), _jsx("span", { className: "truncate", children: item.label })] }), onReorder && items.length > 1 && (_jsx(SidebarReorderMenu, { label: item.label, index: index, total: items.length, onMove: onMove }))] }, item.href));
                }) }) }) }));
}
