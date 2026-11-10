"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "../../components/ui/DropdownMenu.js";
import { Tooltip } from "../../components/ui/Tooltip.js";
import { VStack } from "../../components/ui/VStack.js";
import { SIDEBAR_RAIL_HEIGHT, STICKY_PANEL_TOP } from "../../lib/layout-tokens.js";
import { ICON_SIZE_CLASS } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
function matchesPathname(pathname, href) {
    return pathname === href || (href !== "/" && (pathname === null || pathname === void 0 ? void 0 : pathname.startsWith(href)));
}
function resolveActive(pathname, item) {
    var _a;
    return (_a = item.isActive) !== null && _a !== void 0 ? _a : matchesPathname(pathname, item.href);
}
const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
const REACT_MEMO_TYPE = Symbol.for("react.memo");
/**
 * A plain function or class is a component reference outright. `lucide-react` (and
 * many other icon sets) ship `forwardRef`/`memo`-wrapped components instead, which are
 * objects carrying a `$$typeof` tag rather than functions — an already-rendered
 * element carries the same shape of tag (`Symbol.for("react.element")`), so only these
 * two tags count as "a component to invoke", everything else is treated as a node.
 */
function isIconComponent(icon) {
    if (typeof icon === "function")
        return true;
    if (typeof icon === "object" && icon !== null && "$$typeof" in icon) {
        const type = icon.$$typeof;
        return type === REACT_FORWARD_REF_TYPE || type === REACT_MEMO_TYPE;
    }
    return false;
}
/**
 * `display: contents` keeps the wrapper out of the box model, so a caller-supplied
 * component gets the exact size classes the rail/drawer applies while an
 * already-rendered node keeps its own — both stay `aria-hidden` since the link's own
 * `aria-label`/text carries the accessible name.
 */
function SidebarGlyph({ icon, className }) {
    if (isIconComponent(icon)) {
        const Icon = icon;
        return (_jsx("span", { "aria-hidden": "true", className: "contents", children: _jsx(Icon, { className: className }) }));
    }
    return (_jsx("span", { "aria-hidden": "true", className: "contents", children: icon }));
}
/**
 * Per-row reorder menu. Move up / Move down are rendered only where they apply, so the
 * first row has no Move up and the last row no Move down (as AccivaSidebar does).
 */
function SidebarReorderMenu({ label, index, total, onMove, }) {
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { children: _jsx(Button, { variant: "ghost", size: "sm", iconOnly: true, tooltip: `Reorder ${label}`, className: "shrink-0", children: _jsx(Ellipsis, { className: "size-4" }) }) }), _jsxs(DropdownMenuContent, { align: "start", children: [index > 0 && (_jsx(DropdownMenuItem, { icon: _jsx(ArrowUp, { className: "size-4" }), onClick: () => onMove(index, index - 1), children: "Move up" })), index < total - 1 && (_jsx(DropdownMenuItem, { icon: _jsx(ArrowDown, { className: "size-4" }), onClick: () => onMove(index, index + 1), children: "Move down" }))] })] }));
}
export function Sidebar({ items, mobileOpen = false, onMobileClose = () => { }, mobileNav = true, className, onReorder, }) {
    const pathname = usePathname();
    const railRefs = useRef([]);
    const drawerRefs = useRef([]);
    // Alt+Arrow moves the row, which React re-inserts; refocus the moved link after commit.
    const pendingFocus = useRef(null);
    // Polite announcement of the last move (SC 4.1.3); keyed by item count so it resets
    // when the list itself changes shape, not on every reorder.
    const [reorderNote, setReorderNote] = useState(null);
    const visibleReorderNote = reorderNote && reorderNote.key === items.length ? reorderNote.text : "";
    useEffect(() => {
        var _a;
        const pending = pendingFocus.current;
        if (!pending)
            return;
        pendingFocus.current = null;
        const refs = pending.list === "rail" ? railRefs.current : drawerRefs.current;
        (_a = refs[pending.index]) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
    });
    const handleReorderMove = (from, to) => {
        if (!onReorder || from === to)
            return;
        setReorderNote({
            text: `Moved ${items[from].label} to position ${to + 1} of ${items.length}`,
            key: items.length,
        });
        onReorder({ from, to });
    };
    /**
     * Arrow keys move focus directly between rail items; every link stays in the
     * natural tab order (no tabIndex={-1}) since the project's own a11y audit
     * only permits removing a `role="link"` from tab order inside a composite
     * widget role (tab/option/menuitem/...), which a real navigation link isn't.
     * Alt+ArrowUp/Down reorders the focused row (SC 2.1.1) in either rendering.
     */
    const handleListKeyDown = (list, event) => {
        var _a;
        const refs = list === "rail" ? railRefs.current : drawerRefs.current;
        const current = refs.findIndex((node) => node === document.activeElement);
        if (current === -1)
            return;
        if (onReorder && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            const to = event.key === "ArrowUp" ? current - 1 : current + 1;
            if (to < 0 || to >= items.length)
                return;
            event.preventDefault();
            pendingFocus.current = { list, index: to };
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
        (_a = railRefs.current[nextIndex]) === null || _a === void 0 ? void 0 : _a.focus({ preventScroll: true });
    };
    return (_jsxs(_Fragment, { children: [_jsx("aside", { className: cn("hidden w-20 shrink-0 border-r border-border bg-surface lg:sticky lg:block lg:overflow-y-auto", STICKY_PANEL_TOP, SIDEBAR_RAIL_HEIGHT, className), children: _jsx(VStack, { as: "nav", "aria-label": "Primary navigation", spacing: "sm", align: "center", inset: "md", className: "h-full", children: _jsx(VStack, { as: "ul", spacing: "sm", align: "center", className: "w-full", onKeyDown: (event) => handleListKeyDown("rail", event), children: items.map((item, index) => {
                            const active = resolveActive(pathname, item);
                            return (_jsxs("li", { className: "w-full", children: [_jsx(Tooltip, { content: item.label, side: "right", children: _jsx(Link, { ref: (node) => {
                                                railRefs.current[index] = node;
                                            }, href: item.href, "aria-label": item.label, "aria-current": active ? "page" : undefined, className: cn("focus-ring mx-auto flex h-11 w-11 items-center justify-center rounded-lg transition-colors motion-feedback", active
                                                ? "bg-primary-500/15 text-primary-800 dark:text-primary-300"
                                                : "text-foreground hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground"), children: _jsx(SidebarGlyph, { icon: item.icon, className: cn(ICON_SIZE_CLASS.lg, "shrink-0") }) }) }), onReorder && items.length > 1 && (_jsx("div", { className: "mt-2 flex justify-center", children: _jsx(SidebarReorderMenu, { label: item.label, index: index, total: items.length, onMove: handleReorderMove }) }))] }, item.href));
                        }) }) }) }), mobileNav ? (_jsxs(_Fragment, { children: [_jsx("div", { className: cn("fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"), onClick: onMobileClose, "aria-hidden": "true" }), _jsx("aside", { "aria-label": "Mobile navigation", className: cn("fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface transition-transform duration-200 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full"), children: _jsx(VStack, { as: "nav", "aria-label": "Primary navigation", spacing: "sm", inset: "md", className: "h-full", children: _jsx(VStack, { as: "ul", spacing: "sm", onKeyDown: (event) => handleListKeyDown("drawer", event), children: items.map((item, index) => {
                                    const active = resolveActive(pathname, item);
                                    return (_jsxs("li", { className: "flex items-center gap-1", children: [_jsxs(Link, { ref: (node) => {
                                                    drawerRefs.current[index] = node;
                                                }, href: item.href, onClick: onMobileClose, "aria-current": active ? "page" : undefined, className: cn("focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-feedback", active
                                                    ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                                                    : "text-foreground hover:bg-elevation-3 hover:text-foreground active:bg-elevation-4 active:text-foreground"), children: [_jsx(SidebarGlyph, { icon: item.icon, className: cn(ICON_SIZE_CLASS.lg, "shrink-0") }), _jsx("span", { className: "truncate", children: item.label })] }), onReorder && items.length > 1 && (_jsx(SidebarReorderMenu, { label: item.label, index: index, total: items.length, onMove: handleReorderMove }))] }, item.href));
                                }) }) }) })] })) : null, onReorder ? (_jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: visibleReorderNote })) : null] }));
}
