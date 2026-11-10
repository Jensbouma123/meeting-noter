"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { BottomNavItemView } from "./BottomNavParts.js";
import { HIDE_AT_CLASSES, MAX_ITEMS, POSITION_CLASSES } from "./BottomNavClasses.js";
import { useBottomNavLifecycle } from "./useBottomNavLifecycle.js";
export function BottomNav({ items, position = "fixed", hideAt = "md", className, "aria-label": ariaLabel, }) {
    const navRef = useBottomNavLifecycle(items.length);
    const visibleItems = items.slice(0, MAX_ITEMS);
    return (_jsx("nav", { ref: navRef, "aria-label": ariaLabel ?? "Primary", className: cn(
        // `h-safe-nav` + `pb-safe` is what keeps `--safe-bottom-nav` truthful: the bar is
        // exactly `--bottom-nav-height` of content plus the home-indicator inset it pads
        // itself back over, which is the height Drawer and Toast anchor above (see [[pwa]]).
        "flex h-safe-nav border-t border-border bg-surface pb-safe", POSITION_CLASSES[position], HIDE_AT_CLASSES[hideAt], className), children: _jsx("ul", { className: "flex h-full w-full", children: visibleItems.map((item) => (_jsx(BottomNavItemView, { item: item }, item.href ?? item.label))) }) }));
}
