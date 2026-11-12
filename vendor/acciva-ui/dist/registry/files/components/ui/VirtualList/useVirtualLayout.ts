import { useCallback, useEffect, useLayoutEffect, useMemo, type RefObject } from "react";
import { SCROLL_TO_TOP_EXTRA_SPACE } from "@/components/ui/VirtualList/constants";
import { findOffsetIndex } from "@/components/ui/VirtualList/layoutMath";
import type { VirtualListProps, VirtualListRange } from "@/components/ui/VirtualList/types";

export interface VirtualLayout {
  offsets: Float64Array | null;
  total: number;
}

interface VirtualLayoutOptions<T> {
  items: readonly T[];
  itemHeight: VirtualListProps<T>["itemHeight"];
  dynamic: boolean;
  getItemKey?: VirtualListProps<T>["getItemKey"];
  measuredSnapshot: ReadonlyMap<string | number, number>;
  baseHeightAt: (index: number) => number;
  scrollToTopEnabled: boolean;
  scrollTop: number;
  viewportHeight: number;
  overscan: number;
  firstVisibleRef: RefObject<number>;
  onVisibleRangeChange?: VirtualListProps<T>["onVisibleRangeChange"];
}

export function useVirtualLayout<T>({
  items,
  itemHeight,
  dynamic,
  getItemKey,
  measuredSnapshot,
  baseHeightAt,
  scrollToTopEnabled,
  scrollTop,
  viewportHeight,
  overscan,
  firstVisibleRef,
  onVisibleRangeChange,
}: VirtualLayoutOptions<T>) {
  const count = items.length;
  const fixedHeight = typeof itemHeight === "number" ? itemHeight : 0;
  const uniform = typeof itemHeight === "number" && !dynamic;

  const layout = useMemo<VirtualLayout>(() => {
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

  const offsetAt = useCallback(
    (index: number) => (layout.offsets ? layout.offsets[index] : index * fixedHeight),
    [layout, fixedHeight],
  );

  const sizeAt = useCallback(
    (index: number) => (layout.offsets ? layout.offsets[index + 1] - layout.offsets[index] : fixedHeight),
    [layout, fixedHeight],
  );

  const range = useMemo<VirtualListRange>(() => {
    if (count === 0) return { start: 0, end: 0 };
    let start: number;
    let end: number;
    if (layout.offsets) {
      start = findOffsetIndex(layout.offsets, scrollTop);
      end = findOffsetIndex(layout.offsets, scrollTop + viewportHeight) + 1;
    } else {
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
