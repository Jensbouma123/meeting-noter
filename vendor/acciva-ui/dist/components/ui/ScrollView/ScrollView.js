"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useId, useRef } from "react";
import { cn } from "../../../lib/utils.js";
import { GAP_CLASSES, PADDING_CLASSES, WRAP_AT_CLASSES, getScrollbarClasses, getSnapClasses } from "./scrollViewClasses.js";
import { ScrollViewChrome } from "./ScrollViewChrome.js";
import { useScrollHandle } from "./useScrollHandle.js";
import { useScrollKeyboard } from "./useScrollKeyboard.js";
import { useScrollPosition } from "./useScrollPosition.js";
import { useScrollState } from "./useScrollState.js";
import { useScrollWheel } from "./useScrollWheel.js";
export const ScrollView = forwardRef(function ScrollView({ orientation = "horizontal", fadeEdges = false, showArrows = false, snap = "none", mouseWheel = true, scrollbar = "auto", gap = "none", padding = "none", wrapAt = "never", step, scrollRef, className, contentClassName, viewportClassName, onScroll, onScrollChange, label, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, startArrowAriaLabel, endArrowAriaLabel, children, tabIndex = 0, role = "region", ...props }, forwardedRef) {
    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const contentRef = useRef(null);
    const regionId = useId();
    const isHorizontal = orientation === "horizontal";
    const { scrollState, handleScroll } = useScrollState({
        isHorizontal,
        viewportRef,
        contentRef,
        onScroll,
        onScrollChange,
    });
    const { getScrollDelta, scrollByDelta, scrollToStart, scrollToEnd, scrollToPosition } = useScrollPosition({ isHorizontal, step, viewportRef });
    useScrollHandle({
        scrollRef,
        forwardedRef,
        containerRef,
        viewportRef,
        scrollState,
        scrollToStart,
        scrollToEnd,
        scrollByDelta,
        scrollToPosition,
    });
    useScrollWheel({ isHorizontal, mouseWheel, viewportRef });
    const handleKeyDown = useScrollKeyboard({
        isHorizontal,
        viewportRef,
        onKeyDown: props.onKeyDown,
        getScrollDelta,
        scrollByDelta,
        scrollToStart,
        scrollToEnd,
    });
    // A generic fallback name is better than an unnamed region, but a caller-supplied
    // `aria-labelledby` already names it — adding aria-label on top would leave a
    // reader announcing whichever one it prefers (SC 4.1.2).
    const viewportLabel = ariaLabel ??
        label ??
        (ariaLabelledBy ? undefined : isHorizontal ? "Horizontal scroll view" : "Vertical scroll view");
    return (_jsxs("div", { ref: containerRef, className: cn("group relative w-full", className), ...props, children: [_jsx("div", { ref: viewportRef, id: regionId, role: role, tabIndex: tabIndex, "aria-label": viewportLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, onScroll: handleScroll, onKeyDown: handleKeyDown, className: cn("focus-ring relative w-full scroll-smooth overscroll-contain touch-pan-x", isHorizontal ? "flex-row touch-pan-x" : "flex-col touch-pan-y", getScrollbarClasses(scrollbar, isHorizontal), getSnapClasses(snap, isHorizontal), WRAP_AT_CLASSES[wrapAt], viewportClassName), children: _jsx("div", { ref: contentRef, className: cn("flex min-w-full", isHorizontal ? "flex-row items-center" : "flex-col", GAP_CLASSES[gap], PADDING_CLASSES[padding], WRAP_AT_CLASSES[wrapAt], contentClassName), children: children }) }), _jsx(ScrollViewChrome, { isHorizontal: isHorizontal, regionId: regionId, fadeEdges: fadeEdges, showArrows: showArrows, wrapAt: wrapAt, scrollState: scrollState, startArrowAriaLabel: startArrowAriaLabel, endArrowAriaLabel: endArrowAriaLabel, onStart: () => scrollByDelta(-getScrollDelta()), onEnd: () => scrollByDelta(getScrollDelta()) })] }));
});
