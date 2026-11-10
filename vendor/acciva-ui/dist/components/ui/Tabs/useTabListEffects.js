import { useEffect, useRef } from "react";
import { placeIndicator } from "./placeIndicator.js";
export function useTabListEffects({ listRef, indicatorRef, drag, value, variant, horizontal, canIndicate }) {
    const mounted = useRef(false);
    // Edge-fade hints: written straight to the DOM so scrolling never re-renders the tree.
    useEffect(() => {
        const list = listRef.current;
        if (!list || !horizontal)
            return;
        const update = () => {
            list.dataset.overflowStart = String(list.scrollLeft > 1);
            list.dataset.overflowEnd = String(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
        };
        update();
        list.addEventListener("scroll", update, { passive: true });
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
        observer?.observe(list);
        return () => {
            list.removeEventListener("scroll", update);
            observer?.disconnect();
        };
    }, [horizontal, listRef]);
    // Park the indicator on the selected tab; re-measure when the list or that tab resizes.
    useEffect(() => {
        const list = listRef.current;
        const tab = list?.querySelector('[role="tab"][aria-selected="true"]');
        if (!list || !canIndicate)
            return;
        const measure = () => drag.current?.active || placeIndicator(indicatorRef.current, tab ?? null, variant);
        measure();
        // Ready one frame later so the first placement is not animated from the origin.
        const raf = requestAnimationFrame(() => (list.dataset.indicatorReady = ""));
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        observer?.observe(list);
        if (tab)
            observer?.observe(tab);
        return () => {
            cancelAnimationFrame(raf);
            observer?.disconnect();
        };
    }, [value, variant, canIndicate, listRef, indicatorRef, drag]);
    useEffect(() => () => {
        cancelAnimationFrame(drag.current?.raf ?? 0);
        clearTimeout(drag.current?.timer);
    }, [drag]);
    // Keep the selected tab visible (SC 2.4.11); scroll-padding on the list clears the fade.
    useEffect(() => {
        if (!horizontal)
            return;
        const tab = listRef.current?.querySelector('[role="tab"][aria-selected="true"]');
        tab?.scrollIntoView?.({ inline: "nearest", block: "nearest", behavior: mounted.current ? "auto" : "instant" });
        mounted.current = true;
    }, [value, horizontal, listRef]);
}
