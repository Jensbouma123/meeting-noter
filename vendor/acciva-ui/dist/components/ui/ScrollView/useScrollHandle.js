import { useImperativeHandle } from "react";
export function useScrollHandle({ scrollRef, forwardedRef, containerRef, viewportRef, scrollState, scrollToStart, scrollToEnd, scrollByDelta, scrollToPosition, }) {
    useImperativeHandle(scrollRef, () => ({
        scrollToStart,
        scrollToEnd,
        scrollBy: scrollByDelta,
        scrollTo: scrollToPosition,
        getScrollElement: () => viewportRef.current,
        getContainerElement: () => containerRef.current,
        getState: () => scrollState,
    }), [scrollToStart, scrollToEnd, scrollByDelta, scrollToPosition, scrollState, containerRef, viewportRef]);
    useImperativeHandle(forwardedRef, () => containerRef.current);
}
