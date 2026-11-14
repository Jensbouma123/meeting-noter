"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { SidebarDrawer } from "./Sidebar/SidebarDrawer.js";
import { SidebarRail } from "./Sidebar/SidebarRail.js";
import { useSidebarReorder } from "./Sidebar/useSidebarReorder.js";
export function Sidebar({ items, mobileOpen = false, onMobileClose = () => { }, mobileNav = true, className, onReorder, }) {
    const pathname = usePathname();
    const railRefs = useRef([]);
    const drawerRefs = useRef([]);
    const { queueFocus, visibleReorderNote, handleReorderMove } = useSidebarReorder({
        items,
        onReorder,
        railRefs,
        drawerRefs,
    });
    return (_jsxs(_Fragment, { children: [_jsx(SidebarRail, { items: items, pathname: pathname, className: className, railRefs: railRefs, onReorder: onReorder, onMove: handleReorderMove, queueFocus: queueFocus }), mobileNav ? (_jsx(SidebarDrawer, { items: items, pathname: pathname, mobileOpen: mobileOpen, onMobileClose: onMobileClose, drawerRefs: drawerRefs, queueFocus: queueFocus, onReorder: onReorder, onMove: handleReorderMove })) : null, onReorder ? (_jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: visibleReorderNote })) : null] }));
}
