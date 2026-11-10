"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "../../lib/utils.js";
const MAX_ITEMS = 5;
const POSITION_CLASSES = {
    fixed: "fixed inset-x-0 bottom-0 z-30",
    static: "w-full shrink-0",
};
const HIDE_AT_CLASSES = {
    never: "",
    sm: "sm:hidden",
    md: "md:hidden",
    lg: "lg:hidden",
    xl: "xl:hidden",
};
// `w-full min-w-0` keeps link and action items filling their `flex-1 min-w-0` cell
// without overflowing a 5-up bar; `[&_svg]:size-6` forces caller icons (often
// `size-4`/`size-5`) up to the 24px minimum so the glyph never shrinks below target.
const ITEM_CLASS = "focus-ring flex h-full w-full min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors motion-feedback active:scale-[0.99] [&_svg]:size-6 [&_svg]:shrink-0";
// Below ~22.5rem (360px) the bar goes icon-only: the label takes the `sr-only`
// visual hiding so it stays in the accessibility tree, and `aria-label` on the
// control keeps the accessible name byte-identical when the text is hidden.
const LABEL_CLASS = "min-w-0 max-w-full truncate max-[22.5rem]:sr-only";
let bottomNavHeightPx = 0;
const listeners = new Set();
function publishBottomNavHeight(height) {
    if (height === bottomNavHeightPx)
        return;
    bottomNavHeightPx = height;
    listeners.forEach((listener) => listener());
}
function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
function getSnapshot() {
    return bottomNavHeightPx;
}
function getServerSnapshot() {
    return 0;
}
/** Lets a Drawer anchor above the on-screen BottomNav instead of the viewport bottom. */
export function useBottomNavHeight() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function BottomNav({ items, position = "fixed", hideAt = "md", className, "aria-label": ariaLabel, }) {
    const navRef = useRef(null);
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (items.length > MAX_ITEMS) {
            console.warn(`[BottomNav] received ${items.length} items; only the first ${MAX_ITEMS} render. Trim the list to ${MAX_ITEMS} or fewer.`);
        }
    }, [items.length]);
    useLayoutEffect(() => {
        const node = navRef.current;
        if (!node)
            return;
        const measure = () => publishBottomNavHeight(node.getBoundingClientRect().height);
        measure();
        if (typeof ResizeObserver === "undefined") {
            return () => publishBottomNavHeight(0);
        }
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => {
            observer.disconnect();
            publishBottomNavHeight(0);
        };
    }, []);
    const visibleItems = items.slice(0, MAX_ITEMS);
    return (_jsx("nav", { ref: navRef, "aria-label": ariaLabel !== null && ariaLabel !== void 0 ? ariaLabel : "Primary", className: cn(
        // `h-safe-nav` + `pb-safe` is what keeps `--safe-bottom-nav` truthful: the bar is
        // exactly `--bottom-nav-height` of content plus the home-indicator inset it pads
        // itself back over, which is the height Drawer and Toast anchor above (see [[pwa]]).
        "flex h-safe-nav border-t border-border bg-surface pb-safe", POSITION_CLASSES[position], HIDE_AT_CLASSES[hideAt], className), children: _jsx("ul", { className: "flex h-full w-full", children: visibleItems.map((item) => {
                var _a;
                const itemClassName = cn(ITEM_CLASS, item.current ? "text-foreground" : "text-muted-foreground hover:text-foreground active:text-foreground");
                const content = (_jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": "true", className: "flex shrink-0 justify-center", children: item.icon }), _jsx("span", { className: LABEL_CLASS, children: item.label })] }));
                return (_jsx("li", { className: "min-w-0 flex-1", children: item.href === undefined ? (_jsx("button", { type: "button", onClick: item.onClick, "aria-label": item.label, "aria-current": item.current ? "page" : undefined, "aria-expanded": item.expanded, "aria-controls": item.controls, className: itemClassName, children: content })) : (_jsx("a", { href: item.href, "aria-label": item.label, "aria-current": item.current ? "page" : undefined, className: itemClassName, children: content })) }, (_a = item.href) !== null && _a !== void 0 ? _a : item.label));
            }) }) }));
}
