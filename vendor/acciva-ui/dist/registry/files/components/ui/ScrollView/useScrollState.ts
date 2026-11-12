import { useCallback, useEffect, useRef, useState, type RefObject, type UIEvent } from "react";
import type { ScrollViewProps, ScrollViewState } from "@/components/ui/ScrollView/types";

interface UseScrollStateOptions {
  isHorizontal: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onScroll: ScrollViewProps["onScroll"];
  onScrollChange: ScrollViewProps["onScrollChange"];
}

export function useScrollState({
  isHorizontal,
  viewportRef,
  contentRef,
  onScroll,
  onScrollChange,
}: UseScrollStateOptions) {
  const onScrollChangeRef = useRef(onScrollChange);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    onScrollChangeRef.current = onScrollChange;
  });

  const [scrollState, setScrollState] = useState<ScrollViewState>({
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
    scrollHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
    canScrollStart: false,
    canScrollEnd: false,
    isScrollable: false,
  });

  const updateScrollState = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = el;
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight);

    const canScrollStart = isHorizontal ? scrollLeft > 1 : scrollTop > 1;
    const canScrollEnd = isHorizontal ? scrollLeft < maxScrollLeft - 1 : scrollTop < maxScrollTop - 1;
    const isScrollable = isHorizontal ? maxScrollLeft > 1 : maxScrollTop > 1;

    const nextState: ScrollViewState = {
      scrollLeft,
      scrollTop,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
      canScrollStart,
      canScrollEnd,
      isScrollable,
    };

    setScrollState((prev) => {
      if (
        prev.scrollLeft === nextState.scrollLeft &&
        prev.scrollTop === nextState.scrollTop &&
        prev.scrollWidth === nextState.scrollWidth &&
        prev.scrollHeight === nextState.scrollHeight &&
        prev.clientWidth === nextState.clientWidth &&
        prev.clientHeight === nextState.clientHeight &&
        prev.canScrollStart === nextState.canScrollStart &&
        prev.canScrollEnd === nextState.canScrollEnd &&
        prev.isScrollable === nextState.isScrollable
      ) {
        return prev;
      }
      return nextState;
    });

    onScrollChangeRef.current?.(nextState);
  }, [isHorizontal, viewportRef]);

  const scheduleScrollState = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      updateScrollState();
    });
  }, [updateScrollState]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport) return;

    // The observer's initial callback does the first measure, after paint.
    if (typeof ResizeObserver === "undefined") {
      updateScrollState();
      return;
    }

    const observer = new ResizeObserver(updateScrollState);

    observer.observe(viewport);
    if (content) observer.observe(content);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [updateScrollState, viewportRef, contentRef]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    scheduleScrollState();
    onScroll?.(event);
  };

  return { scrollState, handleScroll };
}
