import { useEffect, useLayoutEffect, useRef } from "react";
import { MAX_ITEMS } from "./BottomNavClasses.js";
import { publishBottomNavHeight } from "./useBottomNavHeight.js";
/** Dev-warns on overflow and publishes the bar's measured height; returns the ref the bar attaches. */
export function useBottomNavLifecycle(itemCount) {
    const navRef = useRef(null);
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (itemCount > MAX_ITEMS) {
            console.warn(`[BottomNav] received ${itemCount} items; only the first ${MAX_ITEMS} render. Trim the list to ${MAX_ITEMS} or fewer.`);
        }
    }, [itemCount]);
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
    return navRef;
}
