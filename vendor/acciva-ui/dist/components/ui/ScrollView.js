"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState, } from "react";
import { cn } from "../../lib/utils.js";
const GAP_CLASSES = {
    none: "gap-0",
    xs: "gap-1.5",
    sm: "gap-2.5",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
};
const PADDING_CLASSES = {
    none: "p-0",
    xs: "p-1.5",
    sm: "p-2.5",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
};
const WRAP_AT_CLASSES = {
    never: "flex-nowrap",
    sm: "sm:flex-wrap sm:overflow-visible",
    md: "md:flex-wrap md:overflow-visible",
    lg: "lg:flex-wrap lg:overflow-visible",
    xl: "xl:flex-wrap xl:overflow-visible",
};
const WRAP_AT_HIDE_CONTROLS_CLASSES = {
    never: "",
    sm: "sm:hidden",
    md: "md:hidden",
    lg: "lg:hidden",
    xl: "xl:hidden",
};
export const ScrollView = forwardRef(function ScrollView(_a, forwardedRef) {
    var _b;
    var { orientation = "horizontal", fadeEdges = false, showArrows = false, snap = "none", mouseWheel = true, scrollbar = "auto", gap = "none", padding = "none", wrapAt = "never", step, scrollRef, className, contentClassName, viewportClassName, onScroll, onScrollChange, label, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, startArrowAriaLabel, endArrowAriaLabel, children, tabIndex = 0, role = "region" } = _a, props = __rest(_a, ["orientation", "fadeEdges", "showArrows", "snap", "mouseWheel", "scrollbar", "gap", "padding", "wrapAt", "step", "scrollRef", "className", "contentClassName", "viewportClassName", "onScroll", "onScrollChange", "label", "aria-label", "aria-labelledby", "aria-describedby", "startArrowAriaLabel", "endArrowAriaLabel", "children", "tabIndex", "role"]);
    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const contentRef = useRef(null);
    const regionId = useId();
    const onScrollChangeRef = useRef(onScrollChange);
    const frameRef = useRef(null);
    useEffect(() => {
        onScrollChangeRef.current = onScrollChange;
    });
    const [scrollState, setScrollState] = useState({
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
    const isHorizontal = orientation === "horizontal";
    const updateScrollState = useCallback(() => {
        var _a;
        const el = viewportRef.current;
        if (!el)
            return;
        const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = el;
        const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
        const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
        const canScrollStart = isHorizontal ? scrollLeft > 1 : scrollTop > 1;
        const canScrollEnd = isHorizontal ? scrollLeft < maxScrollLeft - 1 : scrollTop < maxScrollTop - 1;
        const isScrollable = isHorizontal ? maxScrollLeft > 1 : maxScrollTop > 1;
        const nextState = {
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
            if (prev.scrollLeft === nextState.scrollLeft &&
                prev.scrollTop === nextState.scrollTop &&
                prev.scrollWidth === nextState.scrollWidth &&
                prev.scrollHeight === nextState.scrollHeight &&
                prev.clientWidth === nextState.clientWidth &&
                prev.clientHeight === nextState.clientHeight &&
                prev.canScrollStart === nextState.canScrollStart &&
                prev.canScrollEnd === nextState.canScrollEnd &&
                prev.isScrollable === nextState.isScrollable) {
                return prev;
            }
            return nextState;
        });
        (_a = onScrollChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onScrollChangeRef, nextState);
    }, [isHorizontal]);
    const scheduleScrollState = useCallback(() => {
        if (frameRef.current !== null)
            return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            updateScrollState();
        });
    }, [updateScrollState]);
    useEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport)
            return;
        // The observer's initial callback does the first measure, after paint.
        if (typeof ResizeObserver === "undefined") {
            updateScrollState();
            return;
        }
        const observer = new ResizeObserver(updateScrollState);
        observer.observe(viewport);
        if (content)
            observer.observe(content);
        return () => {
            observer.disconnect();
            if (frameRef.current !== null)
                cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        };
    }, [updateScrollState]);
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
    }, [isHorizontal, step]);
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
    }, [isHorizontal]);
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
    }, [isHorizontal]);
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
    }, [isHorizontal]);
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
    }, [isHorizontal]);
    useImperativeHandle(scrollRef, () => ({
        scrollToStart,
        scrollToEnd,
        scrollBy: scrollByDelta,
        scrollTo: scrollToPosition,
        getScrollElement: () => viewportRef.current,
        getContainerElement: () => containerRef.current,
        getState: () => scrollState,
    }), [scrollToStart, scrollToEnd, scrollByDelta, scrollToPosition, scrollState]);
    useImperativeHandle(forwardedRef, () => containerRef.current);
    useEffect(() => {
        if (!isHorizontal || !mouseWheel)
            return;
        const el = viewportRef.current;
        if (!el)
            return;
        const handleWheel = (event) => {
            if (event.deltaY === 0 || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
                return;
            const maxScrollLeft = el.scrollWidth - el.clientWidth;
            if (maxScrollLeft <= 0)
                return;
            const goingRight = event.deltaY > 0;
            const canScrollInDirection = goingRight ? el.scrollLeft < maxScrollLeft - 1 : el.scrollLeft > 1;
            if (canScrollInDirection) {
                event.preventDefault();
                el.scrollLeft += event.deltaY;
            }
        };
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            el.removeEventListener("wheel", handleWheel);
        };
    }, [isHorizontal, mouseWheel]);
    const handleKeyDown = (event) => {
        var _a;
        (_a = props.onKeyDown) === null || _a === void 0 ? void 0 : _a.call(props, event);
        if (event.defaultPrevented)
            return;
        const el = viewportRef.current;
        if (!el)
            return;
        const delta = getScrollDelta();
        const pageSize = isHorizontal ? el.clientWidth * 0.85 : el.clientHeight * 0.85;
        if (isHorizontal) {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                scrollByDelta(-delta);
            }
            else if (event.key === "ArrowRight") {
                event.preventDefault();
                scrollByDelta(delta);
            }
            else if (event.key === "Home") {
                event.preventDefault();
                scrollToStart();
            }
            else if (event.key === "End") {
                event.preventDefault();
                scrollToEnd();
            }
            else if (event.key === "PageUp") {
                event.preventDefault();
                scrollByDelta(-pageSize);
            }
            else if (event.key === "PageDown") {
                event.preventDefault();
                scrollByDelta(pageSize);
            }
        }
        else {
            if (event.key === "ArrowUp") {
                event.preventDefault();
                scrollByDelta(-delta);
            }
            else if (event.key === "ArrowDown") {
                event.preventDefault();
                scrollByDelta(delta);
            }
            else if (event.key === "Home") {
                event.preventDefault();
                scrollToStart();
            }
            else if (event.key === "End") {
                event.preventDefault();
                scrollToEnd();
            }
            else if (event.key === "PageUp") {
                event.preventDefault();
                scrollByDelta(-pageSize);
            }
            else if (event.key === "PageDown") {
                event.preventDefault();
                scrollByDelta(pageSize);
            }
        }
    };
    const handleScroll = (event) => {
        scheduleScrollState();
        onScroll === null || onScroll === void 0 ? void 0 : onScroll(event);
    };
    const shouldRenderStartFade = fadeEdges === true || fadeEdges === "both" || fadeEdges === "start";
    const shouldRenderEndFade = fadeEdges === true || fadeEdges === "both" || fadeEdges === "end";
    const arrowsEnabled = showArrows !== false && showArrows !== "none";
    const arrowsHoverOnly = showArrows === "hover";
    const arrowsAuto = showArrows === true || showArrows === "auto";
    const snapClasses = {
        none: "",
        start: isHorizontal ? "snap-x snap-mandatory [&>*]:snap-start" : "snap-y snap-mandatory [&>*]:snap-start",
        center: isHorizontal ? "snap-x snap-mandatory [&>*]:snap-center" : "snap-y snap-mandatory [&>*]:snap-center",
        mandatory: isHorizontal ? "snap-x snap-mandatory [&>*]:snap-start" : "snap-y snap-mandatory [&>*]:snap-start",
        proximity: isHorizontal ? "snap-x snap-proximity [&>*]:snap-start" : "snap-y snap-proximity [&>*]:snap-start",
    }[snap];
    const scrollbarClasses = {
        auto: isHorizontal ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden",
        always: isHorizontal ? "overflow-x-scroll overflow-y-hidden" : "overflow-y-scroll overflow-x-hidden",
        hidden: isHorizontal
            ? "overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            : "overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    }[scrollbar];
    const hideControlsOnWrap = WRAP_AT_HIDE_CONTROLS_CLASSES[wrapAt];
    const defaultStartLabel = isHorizontal ? "Scroll left" : "Scroll up";
    const defaultEndLabel = isHorizontal ? "Scroll right" : "Scroll down";
    // A generic fallback name is better than an unnamed region, but a caller-supplied
    // `aria-labelledby` already names it — adding aria-label on top would leave a
    // reader announcing whichever one it prefers (SC 4.1.2).
    const viewportLabel = (_b = ariaLabel !== null && ariaLabel !== void 0 ? ariaLabel : label) !== null && _b !== void 0 ? _b : (ariaLabelledBy ? undefined : isHorizontal ? "Horizontal scroll view" : "Vertical scroll view");
    return (_jsxs("div", Object.assign({ ref: containerRef, className: cn("group relative w-full", className) }, props, { children: [_jsx("div", { ref: viewportRef, id: regionId, role: role, tabIndex: tabIndex, "aria-label": viewportLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, onScroll: handleScroll, onKeyDown: handleKeyDown, className: cn("focus-ring relative w-full scroll-smooth overscroll-contain touch-pan-x", isHorizontal ? "flex-row touch-pan-x" : "flex-col touch-pan-y", scrollbarClasses, snapClasses, WRAP_AT_CLASSES[wrapAt], viewportClassName), children: _jsx("div", { ref: contentRef, className: cn("flex min-w-full", isHorizontal ? "flex-row items-center" : "flex-col", GAP_CLASSES[gap], PADDING_CLASSES[padding], WRAP_AT_CLASSES[wrapAt], contentClassName), children: children }) }), shouldRenderStartFade && (_jsx("div", { "aria-hidden": "true", className: cn("pointer-events-none absolute z-10 transition-opacity motion-feedback", isHorizontal
                    ? "left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-background to-transparent"
                    : "top-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-b from-background to-transparent", scrollState.canScrollStart ? "opacity-100" : "opacity-0", hideControlsOnWrap) })), shouldRenderEndFade && (_jsx("div", { "aria-hidden": "true", className: cn("pointer-events-none absolute z-10 transition-opacity motion-feedback", isHorizontal
                    ? "right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-background to-transparent"
                    : "bottom-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-background to-transparent", scrollState.canScrollEnd ? "opacity-100" : "opacity-0", hideControlsOnWrap) })), arrowsEnabled && (_jsx("button", { type: "button", "aria-label": startArrowAriaLabel || defaultStartLabel, "aria-controls": regionId, disabled: !scrollState.canScrollStart, onClick: () => scrollByDelta(-getScrollDelta()), className: cn("focus-ring absolute z-20 flex size-8 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground shadow-xs backdrop-blur-xs transition-all hover:bg-surface hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0", isHorizontal
                    ? "left-2 top-1/2 -translate-y-1/2"
                    : "top-2 left-1/2 -translate-x-1/2", arrowsHoverOnly && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100", arrowsAuto && !scrollState.isScrollable && "hidden", hideControlsOnWrap), children: isHorizontal ? _jsx(ChevronLeft, { className: "size-4" }) : _jsx(ChevronUp, { className: "size-4" }) })), arrowsEnabled && (_jsx("button", { type: "button", "aria-label": endArrowAriaLabel || defaultEndLabel, "aria-controls": regionId, disabled: !scrollState.canScrollEnd, onClick: () => scrollByDelta(getScrollDelta()), className: cn("focus-ring absolute z-20 flex size-8 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground shadow-xs backdrop-blur-xs transition-all hover:bg-surface hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-0", isHorizontal
                    ? "right-2 top-1/2 -translate-y-1/2"
                    : "bottom-2 left-1/2 -translate-x-1/2", arrowsHoverOnly && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100", arrowsAuto && !scrollState.isScrollable && "hidden", hideControlsOnWrap), children: isHorizontal ? _jsx(ChevronRight, { className: "size-4" }) : _jsx(ChevronDown, { className: "size-4" }) }))] })));
});
