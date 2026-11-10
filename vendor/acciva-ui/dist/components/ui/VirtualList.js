"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, } from "react";
import { cn } from "../../lib/utils.js";
/**
 * `aria-activedescendant` is only defined on composite widget roles. Setting it
 * on `list`/`rowgroup`/`presentation` is invalid ARIA that AT ignores, so those
 * roles keep the visual roving highlight without the attribute.
 */
const ACTIVEDESCENDANT_ROLES = new Set(["listbox"]);
const DEFAULT_HEIGHT = 400;
const DEFAULT_OVERSCAN = 4;
const DEFAULT_SCROLL_TO_TOP_THRESHOLD = 100;
const SCROLL_TO_TOP_EXTRA_SPACE = 56;
const MEASUREMENT_EPSILON = 0.5;
/**
 * Hysteresis band for the docked (full-width) scroll-to-top state. A single
 * threshold makes momentum and trackpad scrolls flip the state every frame
 * around the boundary, restarting the width transition mid-flight; entering at
 * 24px and only leaving past 48px latches the state through that noise.
 */
const SCROLL_TO_TOP_DOCK_ENTER_DISTANCE = 24;
const SCROLL_TO_TOP_DOCK_EXIT_DISTANCE = 48;
function resolveViewportHeight(height) {
    return typeof height === "number" ? height : DEFAULT_HEIGHT;
}
function findOffsetIndex(offsets, position) {
    let lo = 0;
    let hi = offsets.length - 2;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= position)
            lo = mid;
        else
            hi = mid - 1;
    }
    return lo;
}
export function VirtualList({ items, itemHeight, renderItem, height = DEFAULT_HEIGHT, overscan = DEFAULT_OVERSCAN, dynamic = false, getItemKey, getItemId, isItemDisabled, isItemSelected, onItemSelect, activeIndex, defaultActiveIndex = 0, onActiveIndexChange, interactive = true, role = "list", itemRole = "listitem", label, labelledBy, describedBy, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, className, itemClassName, itemStyle, emptyState, onVisibleRangeChange, listRef, scrollToTop, }) {
    var _a, _b, _c;
    const scrollRef = useRef(null);
    const rafRef = useRef(null);
    const observerRef = useRef(null);
    const measuredRef = useRef(new Map());
    const nodesRef = useRef(new Set());
    const firstVisibleRef = useRef(0);
    const scrollCompensationRef = useRef(0);
    const itemsRef = useRef(items);
    const getItemKeyRef = useRef(getItemKey);
    const generatedId = useId();
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(() => resolveViewportHeight(height));
    const [measuredSnapshot, setMeasuredSnapshot] = useState(() => new Map());
    const [internalActiveIndex, setInternalActiveIndex] = useState(defaultActiveIndex);
    const [scrollToTopDocked, setScrollToTopDocked] = useState(false);
    useEffect(() => {
        itemsRef.current = items;
        getItemKeyRef.current = getItemKey;
    });
    const count = items.length;
    const fixedHeight = typeof itemHeight === "number" ? itemHeight : 0;
    const uniform = typeof itemHeight === "number" && !dynamic;
    const resolvedActiveIndex = activeIndex !== null && activeIndex !== void 0 ? activeIndex : internalActiveIndex;
    const scrollToTopEnabled = Boolean(scrollToTop);
    const scrollToTopOptions = typeof scrollToTop === "object" ? scrollToTop : undefined;
    const scrollToTopPlacement = (_a = scrollToTopOptions === null || scrollToTopOptions === void 0 ? void 0 : scrollToTopOptions.placement) !== null && _a !== void 0 ? _a : "bottom-right";
    const scrollToTopLabel = scrollToTopOptions === null || scrollToTopOptions === void 0 ? void 0 : scrollToTopOptions.label;
    const scrollToTopFullWidth = (_b = scrollToTopOptions === null || scrollToTopOptions === void 0 ? void 0 : scrollToTopOptions.fullWidth) !== null && _b !== void 0 ? _b : false;
    const scrollToTopThreshold = (_c = scrollToTopOptions === null || scrollToTopOptions === void 0 ? void 0 : scrollToTopOptions.threshold) !== null && _c !== void 0 ? _c : DEFAULT_SCROLL_TO_TOP_THRESHOLD;
    const scrollToTopClassName = scrollToTopOptions === null || scrollToTopOptions === void 0 ? void 0 : scrollToTopOptions.className;
    const baseHeightAt = useCallback((index) => {
        if (index < 0 || index >= items.length)
            return 0;
        return typeof itemHeight === "function" ? itemHeight(index, items[index]) : itemHeight;
    }, [itemHeight, items]);
    const baseHeightRef = useRef(baseHeightAt);
    useEffect(() => {
        baseHeightRef.current = baseHeightAt;
    }, [baseHeightAt]);
    const layout = useMemo(() => {
        var _a;
        const extraSpace = scrollToTopEnabled && count > 0 ? SCROLL_TO_TOP_EXTRA_SPACE : 0;
        if (uniform) {
            return { offsets: null, total: count * fixedHeight + extraSpace };
        }
        const offsets = new Float64Array(count + 1);
        for (let i = 0; i < count; i++) {
            const key = getItemKey ? getItemKey(items[i], i) : i;
            offsets[i + 1] = offsets[i] + ((_a = measuredSnapshot.get(key)) !== null && _a !== void 0 ? _a : baseHeightAt(i));
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
    }, [range.start]);
    useEffect(() => {
        onVisibleRangeChange === null || onVisibleRangeChange === void 0 ? void 0 : onVisibleRangeChange(range);
    }, [range, onVisibleRangeChange]);
    const keyAt = useCallback((index) => {
        const currentItems = itemsRef.current;
        const currentGetItemKey = getItemKeyRef.current;
        return currentGetItemKey ? currentGetItemKey(currentItems[index], index) : index;
    }, []);
    const handleResizeEntries = useCallback((entries) => {
        var _a;
        let changed = false;
        let compensation = 0;
        const firstVisible = firstVisibleRef.current;
        const nextMeasured = new Map(measuredRef.current);
        for (const entry of entries) {
            const element = entry.target;
            const index = Number(element.dataset.index);
            if (!Number.isInteger(index))
                continue;
            const box = (_a = entry.borderBoxSize) === null || _a === void 0 ? void 0 : _a[0];
            const measured = box ? box.blockSize : element.getBoundingClientRect().height;
            if (measured <= 0)
                continue;
            const key = keyAt(index);
            const previous = nextMeasured.get(key);
            if (previous !== undefined && Math.abs(previous - measured) < MEASUREMENT_EPSILON)
                continue;
            const before = previous !== null && previous !== void 0 ? previous : baseHeightRef.current(index);
            nextMeasured.set(key, measured);
            changed = true;
            if (index < firstVisible)
                compensation += measured - before;
        }
        if (!changed)
            return;
        measuredRef.current = nextMeasured;
        scrollCompensationRef.current += compensation;
        setMeasuredSnapshot(nextMeasured);
    }, [keyAt]);
    const registerItem = useCallback((node) => {
        if (!node || !dynamic || typeof ResizeObserver === "undefined")
            return;
        if (!observerRef.current)
            observerRef.current = new ResizeObserver(handleResizeEntries);
        const observer = observerRef.current;
        const nodes = nodesRef.current;
        nodes.add(node);
        observer.observe(node);
        return () => {
            nodes.delete(node);
            observer.unobserve(node);
        };
    }, [dynamic, handleResizeEntries]);
    const remeasureMountedItems = useCallback(() => {
        let changed = false;
        const nextMeasured = new Map(measuredRef.current);
        for (const node of nodesRef.current) {
            const index = Number(node.dataset.index);
            if (!Number.isInteger(index))
                continue;
            const measured = node.getBoundingClientRect().height;
            if (measured <= 0)
                continue;
            const key = keyAt(index);
            const previous = nextMeasured.get(key);
            if (previous !== undefined && Math.abs(previous - measured) < MEASUREMENT_EPSILON)
                continue;
            nextMeasured.set(key, measured);
            changed = true;
        }
        if (!changed)
            return;
        measuredRef.current = nextMeasured;
        setMeasuredSnapshot(nextMeasured);
    }, [keyAt]);
    useEffect(() => () => {
        var _a;
        (_a = observerRef.current) === null || _a === void 0 ? void 0 : _a.disconnect();
        observerRef.current = null;
    }, []);
    useLayoutEffect(() => {
        const delta = scrollCompensationRef.current;
        if (delta === 0)
            return;
        scrollCompensationRef.current = 0;
        const element = scrollRef.current;
        if (!element)
            return;
        element.scrollTop += delta;
        setScrollTop(element.scrollTop);
    }, [measuredSnapshot]);
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
    }, [height]);
    const handleScroll = useCallback(() => {
        if (rafRef.current !== null)
            return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const element = scrollRef.current;
            if (element)
                setScrollTop(element.scrollTop);
        });
    }, []);
    useEffect(() => () => {
        if (rafRef.current !== null)
            cancelAnimationFrame(rafRef.current);
    }, []);
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
        element.scrollTop = Math.max(0, Math.min(next, layout.total - visible));
        setScrollTop(element.scrollTop);
    }, [count, offsetAt, sizeAt, layout.total]);
    useImperativeHandle(listRef, () => ({
        scrollToIndex,
        scrollToOffset: (offset) => {
            const element = scrollRef.current;
            if (!element)
                return;
            element.scrollTop = offset;
            setScrollTop(element.scrollTop);
        },
        measureAll: () => {
            measuredRef.current = new Map();
            setMeasuredSnapshot(new Map());
            remeasureMountedItems();
        },
        getScrollElement: () => scrollRef.current,
    }), [scrollToIndex, remeasureMountedItems]);
    const setActiveIndex = useCallback((index) => {
        if (activeIndex === undefined)
            setInternalActiveIndex(index);
        onActiveIndexChange === null || onActiveIndexChange === void 0 ? void 0 : onActiveIndexChange(index);
        scrollToIndex(index);
    }, [activeIndex, onActiveIndexChange, scrollToIndex]);
    const disabledAt = useCallback((index) => (isItemDisabled ? isItemDisabled(items[index], index) : false), [isItemDisabled, items]);
    const findEnabled = useCallback((from, step) => {
        for (let i = from; i >= 0 && i < count; i += step) {
            if (!disabledAt(i))
                return i;
        }
        return -1;
    }, [count, disabledAt]);
    const moveActive = useCallback((delta) => {
        if (count === 0)
            return;
        const target = Math.max(0, Math.min(resolvedActiveIndex + delta, count - 1));
        const forward = findEnabled(target, delta > 0 ? 1 : -1);
        const next = forward === -1 ? findEnabled(target, delta > 0 ? -1 : 1) : forward;
        if (next !== -1)
            setActiveIndex(next);
    }, [count, resolvedActiveIndex, findEnabled, setActiveIndex]);
    const handleKeyDown = useCallback((event) => {
        if (count === 0)
            return;
        const page = Math.max(1, Math.floor(viewportHeight / Math.max(1, sizeAt(resolvedActiveIndex))) - 1);
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                moveActive(1);
                break;
            case "ArrowUp":
                event.preventDefault();
                moveActive(-1);
                break;
            case "PageDown":
                event.preventDefault();
                moveActive(page);
                break;
            case "PageUp":
                event.preventDefault();
                moveActive(-page);
                break;
            case "Home": {
                event.preventDefault();
                const first = findEnabled(0, 1);
                if (first !== -1)
                    setActiveIndex(first);
                break;
            }
            case "End": {
                event.preventDefault();
                const last = findEnabled(count - 1, -1);
                if (last !== -1)
                    setActiveIndex(last);
                break;
            }
            case "Enter":
            case " ":
                if (!onItemSelect)
                    return;
                event.preventDefault();
                if (!disabledAt(resolvedActiveIndex))
                    onItemSelect(items[resolvedActiveIndex], resolvedActiveIndex);
                break;
            default:
        }
    }, [count, viewportHeight, sizeAt, resolvedActiveIndex, moveActive, findEnabled, setActiveIndex, onItemSelect, disabledAt, items]);
    const itemId = useCallback((index) => { var _a; return (_a = getItemId === null || getItemId === void 0 ? void 0 : getItemId(index)) !== null && _a !== void 0 ? _a : `${generatedId}-item-${index}`; }, [getItemId, generatedId]);
    const containerStyle = {
        height: typeof height === "number" ? `${height}px` : height,
        contain: "layout paint",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
    };
    const rendered = [];
    for (let index = range.start; index < range.end; index++) {
        const item = items[index];
        const active = interactive && index === resolvedActiveIndex;
        const disabled = disabledAt(index);
        const selected = isItemSelected ? isItemSelected(item, index) : false;
        const positioned = dynamic
            ? { position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${offsetAt(index)}px)` }
            : { position: "absolute", top: offsetAt(index), left: 0, right: 0, height: sizeAt(index) };
        rendered.push(_jsx("div", { id: itemId(index), ref: registerItem, "data-index": index, "data-active": active || undefined, role: itemRole, "aria-setsize": itemRole === "option" || itemRole === "listitem" ? count : undefined, "aria-posinset": itemRole === "option" || itemRole === "listitem" ? index + 1 : undefined, "aria-selected": itemRole === "option" ? selected : undefined, "aria-disabled": disabled || undefined, "aria-rowindex": itemRole === "row" ? index + 2 : undefined, onClick: onItemSelect && !disabled ? () => onItemSelect(item, index) : undefined, onMouseEnter: interactive && !disabled ? () => setActiveIndex(index) : undefined, className: itemClassName, style: Object.assign(Object.assign({}, positioned), itemStyle), children: renderItem(item, { index, active, selected, disabled }) }, getItemKey ? getItemKey(item, index) : index));
    }
    const handleScrollToTop = useCallback(() => {
        const element = scrollRef.current;
        if (!element)
            return;
        element.scrollTo({ top: 0, behavior: "smooth" });
    }, []);
    const isScrollToTopVisible = scrollToTopEnabled && count > 0 && scrollTop > scrollToTopThreshold;
    const canDock = scrollToTopEnabled && count > 0 && layout.total > viewportHeight;
    const distanceToBottom = layout.total - (scrollTop + viewportHeight);
    const isAtBottom = canDock &&
        distanceToBottom <=
            (scrollToTopDocked ? SCROLL_TO_TOP_DOCK_EXIT_DISTANCE : SCROLL_TO_TOP_DOCK_ENTER_DISTANCE);
    // Reconciling the latch during render (rather than in an effect) keeps the
    // committed DOM and the latch in the same frame, so the width transition never
    // starts from a stale state.
    if (isAtBottom !== scrollToTopDocked)
        setScrollToTopDocked(isAtBottom);
    const isScrollToTopFullWidth = scrollToTopFullWidth || isAtBottom;
    return (_jsxs("div", { ref: scrollRef, onScroll: handleScroll, onKeyDown: interactive ? handleKeyDown : undefined, 
        // The root scrolls whatever `interactive` says, so it is always a tab stop:
        // SC 2.1.1 Keyboard needs a scroll container to be reachable and driveable
        // without a pointer, and arrow keys only scroll an element that can hold focus.
        // `interactive` still gates the active-descendant navigation layered on top.
        tabIndex: 0, role: role, "aria-label": ariaLabel !== null && ariaLabel !== void 0 ? ariaLabel : label, "aria-labelledby": ariaLabelledBy !== null && ariaLabelledBy !== void 0 ? ariaLabelledBy : labelledBy, "aria-describedby": ariaDescribedBy !== null && ariaDescribedBy !== void 0 ? ariaDescribedBy : describedBy, "aria-activedescendant": interactive && count > 0 && ACTIVEDESCENDANT_ROLES.has(role) ? itemId(resolvedActiveIndex) : undefined, className: cn("focus-ring relative overflow-y-auto overflow-x-hidden", className), style: containerStyle, children: [count === 0 ? (emptyState) : (_jsx("div", { role: "presentation", style: { position: "relative", height: layout.total, width: "100%" }, children: rendered })), scrollToTopEnabled && count > 0 && (_jsx("div", { role: "presentation", className: cn("sticky bottom-0 left-0 right-0 z-10 pointer-events-none flex w-full items-center px-3 pb-3", scrollToTopPlacement === "bottom-left" && "justify-start", scrollToTopPlacement === "bottom-center" && "justify-center", scrollToTopPlacement === "bottom-right" && "justify-end"), style: {
                    marginTop: -SCROLL_TO_TOP_EXTRA_SPACE,
                    height: SCROLL_TO_TOP_EXTRA_SPACE,
                }, children: _jsxs("button", { type: "button", tabIndex: isScrollToTopVisible ? 0 : -1, "aria-label": scrollToTopLabel || "Scroll to top", onClick: handleScrollToTop, className: cn("focus-ring inline-flex h-11 min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface/95 text-foreground shadow-md backdrop-blur-xs text-sm font-medium transform-gpu transition-[width,translate,opacity,visibility] motion-feedback hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4 motion-reduce:transition-none", isScrollToTopFullWidth
                        ? "w-full px-4"
                        : scrollToTopLabel
                            ? "w-auto px-4"
                            : "w-11 p-0", isScrollToTopVisible
                        ? "pointer-events-auto opacity-100 translate-y-0 visible"
                        : "pointer-events-none opacity-0 translate-y-2 invisible", scrollToTopClassName), children: [_jsx(ArrowUp, { className: "size-4 shrink-0", "aria-hidden": "true" }), scrollToTopLabel && _jsx("span", { children: scrollToTopLabel })] }) }))] }));
}
