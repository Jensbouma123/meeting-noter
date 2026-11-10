import { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { SCROLL_TO_TOP_EXTRA_SPACE } from "./constants.js";
import { findOffsetIndex } from "./layoutMath.js";
export function useVirtualLayout({ items, itemHeight, dynamic, getItemKey, measuredSnapshot, baseHeightAt, scrollToTopEnabled, scrollTop, viewportHeight, overscan, firstVisibleRef, onVisibleRangeChange, }) {
    const count = items.length;
    const fixedHeight = typeof itemHeight === "number" ? itemHeight : 0;
    const uniform = typeof itemHeight === "number" && !dynamic;
    const layout = useMemo(() => {
        const extraSpace = scrollToTopEnabled && count > 0 ? SCROLL_TO_TOP_EXTRA_SPACE : 0;
        if (uniform) {
            return { offsets: null, total: count * fixedHeight + extraSpace };
        }
        const offsets = new Float64Array(count + 1);
        for (let i = 0; i < count; i++) {
            const key = getItemKey ? getItemKey(items[i], i) : i;
            offsets[i + 1] = offsets[i] + (measuredSnapshot.get(key) ?? baseHeightAt(i));
        }
        return { offsets, total: offsets[count] + extraSpace };
    }, [uniform, count, fixedHeight, baseHeightAt, measuredSnapshot, getItemKey, items, scrollToTopEnabled]);
    const offsetAt = useCallback((index) => (layout.offsets ? layout.offsets[index] : index * fixedHeight), [layout, fixedHeight]);
    const sizeAt = useCallback((index) => (layout.offsets ? layout.offsets[index + 1] - layout.offsets[index] : fixedHeight), [layout, fixedHeight]);
    const range = useMemo(() => {
        if (count === 0)
            return { start: 0, end: 0 };
        let start;
        let end;
        if (layout.offsets) {
            start = findOffsetIndex(layout.offsets, scrollTop);
            end = findOffsetIndex(layout.offsets, scrollTop + viewportHeight) + 1;
        }
        else {
            start = Math.floor(scrollTop / fixedHeight);
            end = Math.ceil((scrollTop + viewportHeight) / fixedHeight);
        }
        return {
            start: Math.max(0, start - overscan),
            end: Math.min(count, Math.max(start, end) + overscan),
        };
    }, [count, layout, scrollTop, viewportHeight, fixedHeight, overscan]);
    useLayoutEffect(() => {
        firstVisibleRef.current = range.start;
    }, [range.start, firstVisibleRef]);
    useEffect(() => {
        onVisibleRangeChange?.(range);
    }, [range, onVisibleRangeChange]);
    return { layout, offsetAt, sizeAt, range };
}
