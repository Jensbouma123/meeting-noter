import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from "next/link";
import { useRef } from "react";
import { Drawer } from "../../ui/Drawer/index.js";
import { useCloseAtDesktop } from "./useCloseAtDesktop.js";
import { ListItem } from "../../ui/ListItem.js";
import { VStack } from "../../ui/VStack.js";
import { ICON_SIZE_CLASS } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { SidebarGlyph, SidebarReorderMenu } from "./SidebarParts.js";
import { useSidebarListKeys } from "./useSidebarListKeys.js";
import { resolveActive } from "./sidebarHelpers.js";
export function SidebarDrawer({ items, pathname, mobileOpen, onMobileClose, drawerRefs, queueFocus, onReorder, onMove, }) {
    const listRef = useRef(null);
    const onListKeyDown = useSidebarListKeys({ containerRef: listRef, list: "drawer", refs: drawerRefs, count: items.length, canReorder: !!onReorder, queueFocus, move: onMove });
    useCloseAtDesktop(mobileOpen, onMobileClose);
    return (_jsx(Drawer, { open: mobileOpen, onOpenChange: (next) => {
            if (!next)
                onMobileClose();
        }, side: "left", defaultSize: "16rem", swipeToDismiss: false, "aria-label": "Mobile navigation", className: "lg:hidden", children: _jsx(VStack, { as: "nav", "aria-label": "Primary navigation", spacing: "sm", inset: "md", className: "h-full", children: _jsx(VStack, { as: "ul", spacing: "sm", ref: listRef, onKeyDown: onListKeyDown, children: items.map((item, index) => {
                    const active = resolveActive(pathname, item);
                    return (_jsxs("li", { className: "flex items-center gap-1", children: [_jsx(ListItem, { asChild: true, title: item.label, selected: active, leading: _jsx(SidebarGlyph, { icon: item.icon, className: cn(ICON_SIZE_CLASS.lg, "shrink-0") }), ref: (node) => {
                                    drawerRefs.current[index] = node;
                                }, onClick: onMobileClose, className: "min-w-0 flex-1", children: _jsx(Link, { href: item.href }) }), onReorder && items.length > 1 && (_jsx(SidebarReorderMenu, { label: item.label, index: index, total: items.length, onMove: onMove }))] }, item.href));
                }) }) }) }));
}
