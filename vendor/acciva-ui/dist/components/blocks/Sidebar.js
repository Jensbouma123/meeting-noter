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
    /**
     * Arrow keys move focus directly between rail items; every link stays in the
     * natural tab order (no tabIndex={-1}) since the project's own a11y audit
     * only permits removing a `role="link"` from tab order inside a composite
     * widget role (tab/option/menuitem/...), which a real navigation link isn't.
     * Alt+ArrowUp/Down reorders the focused row (SC 2.1.1) in either rendering.
     */
    const handleListKeyDown = (list, event) => {
        const refs = list === "rail" ? railRefs.current : drawerRefs.current;
        const current = refs.findIndex((node) => node === document.activeElement);
        if (current === -1)
            return;
        if (onReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            const to = event.key === "ArrowUp" ? current - 1 : current + 1;
            if (to < 0 || to >= items.length)
                return;
            event.preventDefault();
            queueFocus(list, to);
            handleReorderMove(current, to);
            return;
        }
        if (list === "drawer")
            return;
        let nextIndex = null;
        switch (event.key) {
            case "ArrowDown":
                nextIndex = (current + 1) % items.length;
                break;
            case "ArrowUp":
                nextIndex = (current - 1 + items.length) % items.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = items.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        railRefs.current[nextIndex]?.focus({ preventScroll: true });
    };
    return (_jsxs(_Fragment, { children: [_jsx(SidebarRail, { items: items, pathname: pathname, className: className, railRefs: railRefs, onReorder: onReorder, onMove: handleReorderMove, onListKeyDown: (event) => handleListKeyDown("rail", event) }), mobileNav ? (_jsx(SidebarDrawer, { items: items, pathname: pathname, mobileOpen: mobileOpen, onMobileClose: onMobileClose, drawerRefs: drawerRefs, onListKeyDown: (event) => handleListKeyDown("drawer", event), onReorder: onReorder, onMove: handleReorderMove })) : null, onReorder ? (_jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: visibleReorderNote })) : null] }));
}
