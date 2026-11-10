"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button.js";
import { Tooltip } from "../../components/ui/Tooltip.js";
import { TEXT_SIZE } from "../../lib/sizing-tokens.js";
import { SURFACE_SHADOW } from "../../lib/surface-tokens.js";
import { cn } from "../../lib/utils.js";
const ARROW_SIZE = 8;
const CORNER_RADIUS = 8;
const TOOLTIP_FILL = "bg-elevation-3 border-border";
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DEFAULT_EXIT_MS = 180;
function prefersReducedMotion() {
    var _a;
    return (typeof window !== "undefined" &&
        ((_a = window.matchMedia) === null || _a === void 0 ? void 0 : _a.call(window, "(prefers-reduced-motion: reduce)").matches) === true);
}
function getExitDuration() {
    if (typeof window === "undefined")
        return DEFAULT_EXIT_MS;
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--motion-spatial")
        .trim();
    if (raw.endsWith("ms"))
        return parseFloat(raw) || DEFAULT_EXIT_MS;
    if (raw.endsWith("s"))
        return (parseFloat(raw) || DEFAULT_EXIT_MS / 1000) * 1000;
    return DEFAULT_EXIT_MS;
}
function getTransformOrigin(activeSide, arrowOffset, popoverWidth, popoverHeight) {
    if (arrowOffset === 0 || !popoverWidth || !popoverHeight) {
        switch (activeSide) {
            case "top":
                return "center bottom";
            case "bottom":
                return "center top";
            case "left":
                return "right center";
            case "right":
                return "left center";
        }
    }
    const x = Math.round(popoverWidth / 2 + arrowOffset);
    const y = Math.round(popoverHeight / 2 + arrowOffset);
    switch (activeSide) {
        case "top":
            return `${x}px bottom`;
        case "bottom":
            return `${x}px top`;
        case "left":
            return `right ${y}px`;
        case "right":
            return `left ${y}px`;
    }
}
function assignRef(ref, value) {
    if (typeof ref === "function") {
        ref(value);
    }
    else if (ref && typeof ref === "object" && "current" in ref) {
        ref.current = value;
    }
}
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
export function Popover({ content, title, open: controlledOpen, defaultOpen = false, onOpenChange, onClose, dismissOnOutsideClick = false, actionLabel, onAction, placement, side, children, anchorRef, maxWidth = 320, className, animated = true, }) {
    var _a, _b;
    const isControlled = controlledOpen !== undefined;
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const isReducedMotion = prefersReducedMotion();
    const shouldAnimate = animated && !isReducedMotion;
    const [mountedState, setMounted] = useState(open);
    const [visibleState, setVisible] = useState(!shouldAnimate && open);
    const [prevOpen, setPrevOpen] = useState(open);
    const [coords, setCoords] = useState(null);
    const baseId = useId();
    const popoverId = `${baseId}-popover`;
    const titleId = `${baseId}-title`;
    const contentId = `${baseId}-content`;
    const internalTriggerRef = useRef(null);
    const triggerRef = anchorRef !== null && anchorRef !== void 0 ? anchorRef : internalTriggerRef;
    const popoverRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const targetPlacement = (_a = placement !== null && placement !== void 0 ? placement : side) !== null && _a !== void 0 ? _a : "top";
    // Without animation, presence tracks `open` directly; no transition state to sync.
    const mounted = shouldAnimate ? mountedState : open;
    const visible = shouldAnimate ? visibleState : open;
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setMounted(true);
            if (!shouldAnimate) {
                setVisible(true);
            }
        }
        else {
            setVisible(false);
            if (!shouldAnimate) {
                setMounted(false);
            }
        }
    }
    useEffect(() => {
        if (!open || !mounted || !shouldAnimate)
            return;
        const rafId = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(rafId);
    }, [open, mounted, shouldAnimate]);
    useEffect(() => {
        if (open || !mounted || !shouldAnimate)
            return;
        const duration = getExitDuration();
        const timerId = setTimeout(() => {
            setMounted(false);
        }, duration);
        return () => clearTimeout(timerId);
    }, [open, mounted, shouldAnimate]);
    const handleClose = useCallback(() => {
        if (!isControlled) {
            setUncontrolledOpen(false);
        }
        onOpenChange === null || onOpenChange === void 0 ? void 0 : onOpenChange(false);
        onClose === null || onClose === void 0 ? void 0 : onClose();
    }, [isControlled, onOpenChange, onClose]);
    const setOpenState = useCallback((nextOpen) => {
        if (nextOpen === open)
            return;
        if (!nextOpen) {
            handleClose();
        }
        else {
            if (!isControlled) {
                setUncontrolledOpen(true);
            }
            onOpenChange === null || onOpenChange === void 0 ? void 0 : onOpenChange(true);
        }
    }, [open, isControlled, onOpenChange, handleClose]);
    const calculatePosition = useCallback((anchorEl) => {
        if (!anchorEl || !document.body.contains(anchorEl)) {
            setCoords(null);
            return;
        }
        const triggerRect = anchorEl.getBoundingClientRect();
        const popoverEl = popoverRef.current;
        const popoverWidth = (popoverEl === null || popoverEl === void 0 ? void 0 : popoverEl.offsetWidth) || 280;
        const popoverHeight = (popoverEl === null || popoverEl === void 0 ? void 0 : popoverEl.offsetHeight) || 120;
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
        const gap = 8;
        const edgeMargin = 12;
        let activeSide = targetPlacement;
        const topSpace = triggerRect.top - edgeMargin;
        const bottomSpace = viewportHeight - triggerRect.bottom - edgeMargin;
        const leftSpace = triggerRect.left - edgeMargin;
        const rightSpace = viewportWidth - triggerRect.right - edgeMargin;
        if (activeSide === "top" && triggerRect.top - popoverHeight - gap < edgeMargin) {
            if (bottomSpace >= popoverHeight + gap || bottomSpace > topSpace) {
                activeSide = "bottom";
            }
        }
        else if (activeSide === "bottom" && triggerRect.bottom + popoverHeight + gap > viewportHeight - edgeMargin) {
            if (topSpace >= popoverHeight + gap || topSpace > bottomSpace) {
                activeSide = "top";
            }
        }
        else if (activeSide === "left" && triggerRect.left - popoverWidth - gap < edgeMargin) {
            if (rightSpace >= popoverWidth + gap || rightSpace > leftSpace) {
                activeSide = "right";
            }
        }
        else if (activeSide === "right" && triggerRect.right + popoverWidth + gap > viewportWidth - edgeMargin) {
            if (leftSpace >= popoverWidth + gap || leftSpace > rightSpace) {
                activeSide = "left";
            }
        }
        let top = 0;
        let left = 0;
        if (activeSide === "top") {
            top = triggerRect.top - popoverHeight - gap;
            left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
        }
        else if (activeSide === "bottom") {
            top = triggerRect.bottom + gap;
            left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
        }
        else if (activeSide === "left") {
            top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
            left = triggerRect.left - popoverWidth - gap;
        }
        else if (activeSide === "right") {
            top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
            left = triggerRect.right + gap;
        }
        left = Math.max(edgeMargin, Math.min(viewportWidth - popoverWidth - edgeMargin, left));
        top = Math.max(edgeMargin, Math.min(viewportHeight - popoverHeight - edgeMargin, top));
        const halfArrow = ARROW_SIZE / 2;
        let arrowOffset = 0;
        if (activeSide === "top" || activeSide === "bottom") {
            const triggerCenter = triggerRect.left + triggerRect.width / 2;
            const bubbleCenter = left + popoverWidth / 2;
            const maxOffset = Math.max(0, popoverWidth / 2 - CORNER_RADIUS - halfArrow);
            arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, triggerCenter - bubbleCenter));
        }
        else {
            const triggerCenter = triggerRect.top + triggerRect.height / 2;
            const bubbleCenter = top + popoverHeight / 2;
            const maxOffset = Math.max(0, popoverHeight / 2 - CORNER_RADIUS - halfArrow);
            arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, triggerCenter - bubbleCenter));
        }
        setCoords({ top, left, activeSide, arrowOffset, popoverWidth, popoverHeight });
    }, [targetPlacement]);
    useIsomorphicLayoutEffect(() => {
        if (mounted) {
            calculatePosition(triggerRef.current);
        }
    }, [mounted, calculatePosition, triggerRef]);
    useEffect(() => {
        if (mounted) {
            calculatePosition(triggerRef.current);
            const handleScrollOrResize = () => calculatePosition(triggerRef.current);
            const handleGlobalPointerDown = (e) => {
                var _a, _b;
                if (!dismissOnOutsideClick)
                    return;
                const target = e.target;
                if (!target)
                    return;
                if ((_a = popoverRef.current) === null || _a === void 0 ? void 0 : _a.contains(target))
                    return;
                if ((_b = triggerRef.current) === null || _b === void 0 ? void 0 : _b.contains(target))
                    return;
                handleClose();
            };
            const handleGlobalKeyDown = (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClose();
                }
            };
            window.addEventListener("scroll", handleScrollOrResize, true);
            window.addEventListener("resize", handleScrollOrResize);
            if (typeof window.visualViewport !== "undefined" && window.visualViewport) {
                window.visualViewport.addEventListener("resize", handleScrollOrResize);
                window.visualViewport.addEventListener("scroll", handleScrollOrResize);
            }
            let resizeObserver = null;
            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(() => {
                    calculatePosition(triggerRef.current);
                });
                if (triggerRef.current)
                    resizeObserver.observe(triggerRef.current);
                if (popoverRef.current)
                    resizeObserver.observe(popoverRef.current);
            }
            window.addEventListener("pointerdown", handleGlobalPointerDown);
            window.addEventListener("keydown", handleGlobalKeyDown);
            return () => {
                window.removeEventListener("scroll", handleScrollOrResize, true);
                window.removeEventListener("resize", handleScrollOrResize);
                if (typeof window.visualViewport !== "undefined" && window.visualViewport) {
                    window.visualViewport.removeEventListener("resize", handleScrollOrResize);
                    window.visualViewport.removeEventListener("scroll", handleScrollOrResize);
                }
                resizeObserver === null || resizeObserver === void 0 ? void 0 : resizeObserver.disconnect();
                window.removeEventListener("pointerdown", handleGlobalPointerDown);
                window.removeEventListener("keydown", handleGlobalKeyDown);
            };
        }
    }, [mounted, calculatePosition, dismissOnOutsideClick, handleClose, triggerRef]);
    // Drop stale coords once unmounted so the next open measures from scratch.
    if (!mounted && coords !== null) {
        setCoords(null);
    }
    const prevOpenRef = useRef(open);
    useEffect(() => {
        var _a;
        if (open && !prevOpenRef.current) {
            previouslyFocusedRef.current = (_a = document.activeElement) !== null && _a !== void 0 ? _a : triggerRef.current;
            const frameId = requestAnimationFrame(() => {
                const popoverEl = popoverRef.current;
                if (!popoverEl)
                    return;
                const firstFocusable = popoverEl.querySelector(FOCUSABLE_SELECTOR);
                (firstFocusable !== null && firstFocusable !== void 0 ? firstFocusable : popoverEl).focus({ preventScroll: true });
                // Marked here, not after the branch: this branch returns early, so without it
                // the close branch never ran and focus was never returned to the trigger.
                prevOpenRef.current = true;
            });
            return () => cancelAnimationFrame(frameId);
        }
        else if (!open && prevOpenRef.current) {
            if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === "function") {
                previouslyFocusedRef.current.focus({ preventScroll: true });
            }
            else if (triggerRef.current && typeof triggerRef.current.focus === "function") {
                triggerRef.current.focus({ preventScroll: true });
            }
        }
        prevOpenRef.current = open;
    }, [open, triggerRef]);
    const handlePopoverKeyDown = (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
            return;
        }
        if (e.key === "Tab") {
            const popoverEl = popoverRef.current;
            if (!popoverEl)
                return;
            const focusable = Array.from(popoverEl.querySelectorAll(FOCUSABLE_SELECTOR));
            if (focusable.length === 0)
                return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || document.activeElement === popoverEl) {
                    e.preventDefault();
                    last.focus({ preventScroll: true });
                }
            }
            else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus({ preventScroll: true });
                }
            }
        }
    };
    const handleActionClick = () => {
        onAction === null || onAction === void 0 ? void 0 : onAction();
    };
    let triggerNode = null;
    if (children && isValidElement(children)) {
        const child = children;
        const childProps = child.props;
        const TriggerComponent = child.type;
        triggerNode = (_createElement(TriggerComponent, Object.assign({}, childProps, { key: child.key, ref: (node) => {
                internalTriggerRef.current = node;
                assignRef(childProps.ref, node);
            }, "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": open ? popoverId : undefined, onClick: (e) => {
                var _a;
                (_a = childProps.onClick) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
                setOpenState(!open);
            }, onKeyDown: (event) => {
                var _a;
                (_a = childProps.onKeyDown) === null || _a === void 0 ? void 0 : _a.call(childProps, event);
                if (event.key === "Escape" && open) {
                    event.stopPropagation();
                    handleClose();
                }
            } })));
    }
    const activeSide = (coords === null || coords === void 0 ? void 0 : coords.activeSide) || targetPlacement;
    const arrowOffset = (_b = coords === null || coords === void 0 ? void 0 : coords.arrowOffset) !== null && _b !== void 0 ? _b : 0;
    const resolvedMaxWidth = typeof maxWidth === "number"
        ? `min(${maxWidth}px, calc(100vw - 24px))`
        : `min(${maxWidth}, calc(100vw - 24px))`;
    const portalContent = mounted && typeof document !== "undefined"
        ? createPortal(_jsxs("div", { ref: popoverRef, role: "dialog", id: popoverId, tabIndex: -1, "aria-modal": "false", "aria-labelledby": title ? titleId : undefined, "aria-describedby": contentId, onKeyDown: handlePopoverKeyDown, "data-state": visible ? "open" : "closed", style: {
                position: "fixed",
                top: coords ? `${coords.top}px` : "-9999px",
                left: coords ? `${coords.left}px` : "-9999px",
                width: "max-content",
                maxWidth: resolvedMaxWidth,
                maxHeight: "calc(100vh - 24px)",
                transformOrigin: getTransformOrigin(activeSide, arrowOffset, coords === null || coords === void 0 ? void 0 : coords.popoverWidth, coords === null || coords === void 0 ? void 0 : coords.popoverHeight),
                zIndex: 999999,
            }, className: cn("rounded-lg border p-3.5 text-foreground leading-relaxed outline-hidden", TOOLTIP_FILL, SURFACE_SHADOW.overlay, shouldAnimate
                ? "transition-[opacity,transform] motion-spatial ease-emphasized motion-reduce:transition-none"
                : "transition-none", visible && coords
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none", className), children: [_jsxs("div", { className: cn("flex items-start gap-2", title ? "justify-between" : "justify-end"), children: [title && (_jsx("h2", { id: titleId, className: cn("font-semibold text-foreground leading-snug break-words", TEXT_SIZE.sm), children: title })), _jsx(Tooltip, { content: "Close", delay: 150, children: _jsx("span", { className: "inline-flex shrink-0 -mr-1 -mt-1", children: _jsx(Button, { variant: "ghost", size: "sm", "aria-label": "Close", onClick: handleClose, onFocus: (e) => e.stopPropagation(), className: "touch-target-44 justify-center p-0", children: _jsx(X, { className: "size-4", "aria-hidden": "true" }) }) }) })] }), _jsx("div", { id: contentId, className: cn("text-muted-foreground break-words whitespace-normal max-h-[calc(100vh-96px)] overflow-y-auto", TEXT_SIZE.xs, title ? "mt-1.5" : "mt-0"), children: content }), actionLabel && (_jsx("div", { className: "mt-3 flex justify-end", children: _jsx(Button, { variant: "primary", size: "xs", onClick: handleActionClick, children: actionLabel }) })), _jsx("span", { "aria-hidden": "true", className: cn("absolute size-2 pointer-events-none", TOOLTIP_FILL, activeSide === "top" && "bottom-[-4.5px] border-r border-b", activeSide === "bottom" && "top-[-4.5px] border-l border-t", activeSide === "left" && "right-[-4.5px] border-t border-r", activeSide === "right" && "left-[-4.5px] border-b border-l"), style: activeSide === "top" || activeSide === "bottom"
                        ? { left: `calc(50% + ${arrowOffset}px)`, transform: "translateX(-50%) rotate(45deg)" }
                        : { top: `calc(50% + ${arrowOffset}px)`, transform: "translateY(-50%) rotate(45deg)" } })] }), document.body)
        : null;
    return (_jsxs(_Fragment, { children: [triggerNode, portalContent] }));
}
