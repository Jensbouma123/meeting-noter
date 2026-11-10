import { useLayoutEffect, useRef } from "react";
export const PEEK_VAR = "--bottom-nav-drawer-peek";
/** Collapsed height per mounted drawer; the published variable is the tallest (page-scoped mounts overlap on route change). */
const heights = new Map();
function publish() {
    const root = document.documentElement.style;
    if (heights.size === 0)
        root.removeProperty(PEEK_VAR);
    else
        root.setProperty(PEEK_VAR, `${Math.max(...heights.values())}px`);
}
/**
 * Measures the handle + peek row and publishes it as `--bottom-nav-drawer-peek` on the root
 * element: the panel's collapsed translate reads it, and so does the page's `pb-safe-nav-drawer`
 * padding (SC 2.4.11). A drawer hidden at `hideAt` measures 0, so the padding drops with it.
 * Removed on unmount, so a page without a drawer reserves nothing.
 */
export function usePeekHeight() {
    const headerRef = useRef(null);
    useLayoutEffect(() => {
        const node = headerRef.current;
        if (!node)
            return;
        const measure = () => {
            heights.set(node, node.getBoundingClientRect().height);
            publish();
        };
        measure();
        if (process.env.NODE_ENV !== "production" && [...heights.values()].filter((h) => h > 0).length > 1) {
            console.warn("BottomNavDrawer: two drawers are visible at once; only one per BottomNav is supported.");
        }
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        observer?.observe(node);
        return () => {
            observer?.disconnect();
            heights.delete(node);
            publish();
        };
    }, []);
    return headerRef;
}
