import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, } from "react";
import { resolveViewportHeight } from "./layoutMath.js";
export function useVirtualScroll({ listRef, scrollRef, height, count, layoutTotal, offsetAt, sizeAt, setScrollTop, setViewportHeight, measureAll, }) {
    const rafRef = useRef(null);
    const handleScroll = useCallback(() => {
        if (rafRef.current !== null)
            return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const element = scrollRef.current;
            if (element)
                setScrollTop(element.scrollTop);
        });
    }, [scrollRef, setScrollTop]);
    useEffect(() => () => {
        if (rafRef.current !== null)
            cancelAnimationFrame(rafRef.current);
    }, []);
    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (!element)
            return;
        setViewportHeight(element.clientHeight || resolveViewportHeight(height));
        if (typeof ResizeObserver === "undefined")
            return;
        const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
        observer.observe(element);
        return () => observer.disconnect();
    }, [height, scrollRef, setViewportHeight]);
    const scrollToIndex = useCallback((index, align = "auto") => {
        const element = scrollRef.current;
        if (!element || index < 0 || index >= count)
            return;
        const top = offsetAt(index);
        const size = sizeAt(index);
        const visible = element.clientHeight;
        let next;
        if (align === "start")
            next = top;
        else if (align === "end")
            next = top + size - visible;
        else if (align === "center")
            next = top + size / 2 - visible / 2;
        else if (top < element.scrollTop)
            next = top;
        else if (top + size > element.scrollTop + visible)
            next = top + size - visible;
        else
            return;
        element.scrollTop = Math.max(0, Math.min(next, layoutTotal - visible));
        setScrollTop(element.scrollTop);
    }, [count, offsetAt, sizeAt, layoutTotal, scrollRef, setScrollTop]);
    useImperativeHandle(listRef, () => ({
        scrollToIndex,
        scrollToOffset: (offset) => {
            const element = scrollRef.current;
            if (!element)
                return;
            element.scrollTop = offset;
            setScrollTop(element.scrollTop);
        },
        measureAll,
        getScrollElement: () => scrollRef.current,
    }), [scrollToIndex, measureAll, scrollRef, setScrollTop]);
    const handleScrollToTop = useCallback(() => {
        const element = scrollRef.current;
        if (!element)
            return;
        element.scrollTo({ top: 0, behavior: "smooth" });
    }, [scrollRef]);
    return { handleScroll, handleScrollToTop, scrollToIndex };
}
