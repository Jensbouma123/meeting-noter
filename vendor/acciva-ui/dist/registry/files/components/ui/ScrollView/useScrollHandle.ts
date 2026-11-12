import { useImperativeHandle, type ForwardedRef, type RefObject } from "react";
import type { ScrollViewProps, ScrollViewState } from "@/components/ui/ScrollView/types";

interface UseScrollHandleOptions {
  scrollRef: ScrollViewProps["scrollRef"];
  forwardedRef: ForwardedRef<HTMLDivElement>;
  containerRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  scrollState: ScrollViewState;
  scrollToStart: (behavior?: ScrollBehavior) => void;
  scrollToEnd: (behavior?: ScrollBehavior) => void;
  scrollByDelta: (delta: number, behavior?: ScrollBehavior) => void;
  scrollToPosition: (options: ScrollToOptions | number) => void;
}

export function useScrollHandle({
  scrollRef,
  forwardedRef,
  containerRef,
  viewportRef,
  scrollState,
  scrollToStart,
  scrollToEnd,
  scrollByDelta,
  scrollToPosition,
}: UseScrollHandleOptions) {
  useImperativeHandle(
    scrollRef,
    () => ({
      scrollToStart,
      scrollToEnd,
      scrollBy: scrollByDelta,
      scrollTo: scrollToPosition,
      getScrollElement: () => viewportRef.current,
      getContainerElement: () => containerRef.current,
      getState: () => scrollState,
    }),
    [scrollToStart, scrollToEnd, scrollByDelta, scrollToPosition, scrollState, containerRef, viewportRef],
  );

  useImperativeHandle(forwardedRef, () => containerRef.current as HTMLDivElement);
}
