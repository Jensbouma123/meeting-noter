import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { DEFAULT_HEIGHT, DEFAULT_OVERSCAN, DEFAULT_SCROLL_TO_TOP_THRESHOLD } from "@/components/ui/VirtualList/constants";
import { resolveContainerStyle, resolveViewportHeight } from "@/components/ui/VirtualList/layoutMath";
import type { VirtualListProps } from "@/components/ui/VirtualList/types";
import { useScrollToTopDock } from "@/components/ui/VirtualList/useScrollToTopDock";
import { useVirtualKeyboard } from "@/components/ui/VirtualList/useVirtualKeyboard";
import { useVirtualLayout } from "@/components/ui/VirtualList/useVirtualLayout";
import { useVirtualMeasurements } from "@/components/ui/VirtualList/useVirtualMeasurements";
import { useVirtualScroll } from "@/components/ui/VirtualList/useVirtualScroll";

export function useVirtualListModel<T>(props: VirtualListProps<T>, scrollRef: RefObject<HTMLDivElement | null>) {
  const {
    items,
    itemHeight,
    height = DEFAULT_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
    dynamic = false,
    getItemKey,
    getItemId,
    isItemDisabled,
    onItemSelect,
    activeIndex,
    defaultActiveIndex = 0,
    onActiveIndexChange,
    interactive = true,
    arrowHint,
    onVisibleRangeChange,
    listRef,
    scrollToTop,
  } = props;
  const firstVisibleRef = useRef(0);
  const generatedId = useId();

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => resolveViewportHeight(height));
  const [internalActiveIndex, setInternalActiveIndex] = useState(defaultActiveIndex);

  const count = items.length;
  const resolvedActiveIndex = activeIndex ?? internalActiveIndex;

  const scrollToTopEnabled = Boolean(scrollToTop);
  const scrollToTopOptions = typeof scrollToTop === "object" ? scrollToTop : undefined;
  const scrollToTopThreshold = scrollToTopOptions?.threshold ?? DEFAULT_SCROLL_TO_TOP_THRESHOLD;

  const baseHeightAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return 0;
      return typeof itemHeight === "function" ? itemHeight(index, items[index]) : itemHeight;
    },
    [itemHeight, items],
  );

  const baseHeightRef = useRef(baseHeightAt);
  useEffect(() => {
    baseHeightRef.current = baseHeightAt;
  }, [baseHeightAt]);

  const { measuredSnapshot, registerItem, measureAll } = useVirtualMeasurements({
    items,
    getItemKey,
    dynamic,
    scrollRef,
    firstVisibleRef,
    baseHeightRef,
    setScrollTop,
  });
  const { layout, offsetAt, sizeAt, range } = useVirtualLayout({
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
  });
  const { handleScroll, handleScrollToTop, scrollToIndex } = useVirtualScroll({
    listRef,
    scrollRef,
    height,
    count,
    layoutTotal: layout.total,
    offsetAt,
    sizeAt,
    setScrollTop,
    setViewportHeight,
    measureAll,
  });
  const { handleKeyDown, disabledAt } = useVirtualKeyboard({
    items,
    isItemDisabled,
    onItemSelect,
    activeIndex,
    onActiveIndexChange,
    resolvedActiveIndex,
    setInternalActiveIndex,
    scrollToIndex,
    sizeAt,
    viewportHeight,
  });

  const canDock = scrollToTopEnabled && count > 0 && layout.total > viewportHeight;
  const distanceToBottom = layout.total - (scrollTop + viewportHeight);
  const isScrollToTopFullWidth = useScrollToTopDock(canDock, distanceToBottom, Boolean(scrollToTopOptions?.fullWidth));
  const isScrollToTopVisible = scrollToTopEnabled && count > 0 && scrollTop > scrollToTopThreshold;

  const hint = useArrowHint("list", interactive ? arrowHint : false, "Use arrow keys to move between items");

  const itemId = useCallback(
    (index: number) => getItemId?.(index) ?? `${generatedId}-item-${index}`,
    [getItemId, generatedId],
  );

  return {
    scrollToTopEnabled,
    scrollToTopOptions,
    isScrollToTopVisible,
    isScrollToTopFullWidth,
    handleScrollToTop,
    handleScroll,
    handleKeyDown,
    disabledAt,
    count,
    layout,
    range,
    offsetAt,
    sizeAt,
    registerItem,
    resolvedActiveIndex,
    itemId,
    containerStyle: resolveContainerStyle(height),
    hint,
  };
}
