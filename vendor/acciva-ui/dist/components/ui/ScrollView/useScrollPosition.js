import { useCallback } from "react";
export function useScrollPosition({ isHorizontal, step, viewportRef }) {
    const getScrollDelta = useCallback((customDelta) => {
        if (typeof customDelta === "number")
            return customDelta;
        if (typeof step === "number")
            return step;
        const el = viewportRef.current;
        if (!el)
            return 200;
        const dimension = isHorizontal ? el.clientWidth : el.clientHeight;
        return Math.max(160, Math.floor(dimension * 0.6));
    }, [isHorizontal, step, viewportRef]);
    const scrollByDelta = useCallback((delta, behavior = "smooth") => {
        const el = viewportRef.current;
        if (!el)
            return;
        if (isHorizontal) {
            el.scrollBy({ left: delta, behavior });
        }
        else {
            el.scrollBy({ top: delta, behavior });
        }
    }, [isHorizontal, viewportRef]);
    const scrollToStart = useCallback((behavior = "smooth") => {
        const el = viewportRef.current;
        if (!el)
            return;
        if (isHorizontal) {
            el.scrollTo({ left: 0, behavior });
        }
        else {
            el.scrollTo({ top: 0, behavior });
        }
    }, [isHorizontal, viewportRef]);
    const scrollToEnd = useCallback((behavior = "smooth") => {
        const el = viewportRef.current;
        if (!el)
            return;
        if (isHorizontal) {
            el.scrollTo({ left: el.scrollWidth, behavior });
        }
        else {
            el.scrollTo({ top: el.scrollHeight, behavior });
        }
    }, [isHorizontal, viewportRef]);
    const scrollToPosition = useCallback((options) => {
        const el = viewportRef.current;
        if (!el)
            return;
        if (typeof options === "number") {
            if (isHorizontal) {
                el.scrollTo({ left: options, behavior: "smooth" });
            }
            else {
                el.scrollTo({ top: options, behavior: "smooth" });
            }
        }
        else {
            el.scrollTo(options);
        }
    }, [isHorizontal, viewportRef]);
    return { getScrollDelta, scrollByDelta, scrollToStart, scrollToEnd, scrollToPosition };
}
