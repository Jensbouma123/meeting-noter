"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { isValidElement, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, } from "react";
import { createPortal } from "react-dom";
import { TEXT_SIZE } from "../../lib/sizing-tokens.js";
import { SURFACE_SHADOW } from "../../lib/surface-tokens.js";
import { cn } from "../../lib/utils.js";
const emptySubscribe = () => () => { };
// Must match the arrow's rendered `size-2` (8px) and the bubble's `rounded-lg` (8px) so the
// clamp keeps the arrow off the rounded corner.
const ARROW_SIZE = 8;
const CORNER_RADIUS = 8;
// `elevation-3` is the engine's own overlay level (see `buildSemanticRoles`), so the bubble
// floats above cards and modals — which already sit at `surface` — in both themes, and inverts
// with the mode instead of staying dark in light mode. The arrow repeats it verbatim: any
// opacity or shade difference makes the arrow read as a separate, darker chip.
const TOOLTIP_FILL = "bg-elevation-3 border-border";
/** Merges a manually-managed ref with whatever ref the caller already attached to `child`. */
function assignRef(ref, value) {
    if (typeof ref === "function") {
        ref(value);
    }
    else if (ref) {
        ref.current = value;
    }
}
export function Tooltip({ content, children, side = "top", delay = 0, maxWidth = 280 }) {
    var _a;
    const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState(null);
    const timeoutRef = useRef(null);
    const tooltipId = useId();
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    useEffect(() => {
        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current);
        };
    }, []);
    const calculatePosition = useCallback(() => {
        if (!triggerRef.current || !document.body.contains(triggerRef.current)) {
            setOpen(false);
            setCoords(null);
            return;
        }
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipEl = tooltipRef.current;
        const tooltipWidth = (tooltipEl === null || tooltipEl === void 0 ? void 0 : tooltipEl.offsetWidth) || 160;
        const tooltipHeight = (tooltipEl === null || tooltipEl === void 0 ? void 0 : tooltipEl.offsetHeight) || 40;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const gap = 8;
        const edgeMargin = 12;
        let targetSide = side;
        // Check collision and flip side if necessary
        if (targetSide === "top" && triggerRect.top - tooltipHeight - gap < edgeMargin) {
            targetSide = "bottom";
        }
        else if (targetSide === "bottom" && triggerRect.bottom + tooltipHeight + gap > viewportHeight - edgeMargin) {
            targetSide = "top";
        }
        else if (targetSide === "left" && triggerRect.left - tooltipWidth - gap < edgeMargin) {
            targetSide = "right";
        }
        else if (targetSide === "right" && triggerRect.right + tooltipWidth + gap > viewportWidth - edgeMargin) {
            targetSide = "left";
        }
        let top = 0;
        let left = 0;
        if (targetSide === "top") {
            top = triggerRect.top - tooltipHeight - gap;
            left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        }
        else if (targetSide === "bottom") {
            top = triggerRect.bottom + gap;
            left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        }
        else if (targetSide === "left") {
            top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
            left = triggerRect.left - tooltipWidth - gap;
        }
        else if (targetSide === "right") {
            top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
            left = triggerRect.right + gap;
        }
        // Clamp within viewport margins
        left = Math.max(edgeMargin, Math.min(viewportWidth - tooltipWidth - edgeMargin, left));
        top = Math.max(edgeMargin, Math.min(viewportHeight - tooltipHeight - edgeMargin, top));
        const halfArrow = ARROW_SIZE / 2;
        let arrowOffset = 0;
        if (targetSide === "top" || targetSide === "bottom") {
            const triggerCenter = triggerRect.left + triggerRect.width / 2;
            const bubbleCenter = left + tooltipWidth / 2;
            const maxOffset = Math.max(0, tooltipWidth / 2 - CORNER_RADIUS - halfArrow);
            arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, triggerCenter - bubbleCenter));
        }
        else {
            const triggerCenter = triggerRect.top + triggerRect.height / 2;
            const bubbleCenter = top + tooltipHeight / 2;
            const maxOffset = Math.max(0, tooltipHeight / 2 - CORNER_RADIUS - halfArrow);
            arrowOffset = Math.max(-maxOffset, Math.min(maxOffset, triggerCenter - bubbleCenter));
        }
        setCoords({ top, left, activeSide: targetSide, arrowOffset });
    }, [side]);
    const show = () => {
        const reveal = () => {
            if (triggerRef.current && document.body.contains(triggerRef.current)) {
                setOpen(true);
            }
        };
        if (delay <= 0) {
            reveal();
            return;
        }
        timeoutRef.current = setTimeout(reveal, delay);
    };
    const hide = () => {
        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);
        setOpen(false);
        setCoords(null);
    };
    useEffect(() => {
        if (open) {
            calculatePosition();
            const handleScrollOrResize = () => calculatePosition();
            const handleGlobalPointerDown = () => hide();
            const handleGlobalKeyDown = (e) => {
                if (e.key === "Escape")
                    hide();
            };
            window.addEventListener("scroll", handleScrollOrResize, true);
            window.addEventListener("resize", handleScrollOrResize);
            window.addEventListener("pointerdown", handleGlobalPointerDown);
            window.addEventListener("keydown", handleGlobalKeyDown);
            return () => {
                window.removeEventListener("scroll", handleScrollOrResize, true);
                window.removeEventListener("resize", handleScrollOrResize);
                window.removeEventListener("pointerdown", handleGlobalPointerDown);
                window.removeEventListener("keydown", handleGlobalKeyDown);
            };
        }
    }, [open, calculatePosition]);
    if (!isValidElement(children))
        return children;
    const child = children;
    const childProps = child.props;
    const TriggerComponent = child.type;
    const isDisabled = Boolean(childProps.disabled);
    const eventHandlers = {
        onMouseEnter: (e) => {
            var _a;
            (_a = childProps.onMouseEnter) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            show();
        },
        onMouseLeave: (e) => {
            var _a;
            (_a = childProps.onMouseLeave) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            hide();
        },
        onFocus: (e) => {
            var _a;
            (_a = childProps.onFocus) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            show();
        },
        onBlur: (e) => {
            var _a;
            (_a = childProps.onBlur) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            hide();
        },
        onClick: (e) => {
            var _a;
            (_a = childProps.onClick) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            hide();
        },
        onPointerDown: (e) => {
            var _a;
            (_a = childProps.onPointerDown) === null || _a === void 0 ? void 0 : _a.call(childProps, e);
            hide();
        },
        onKeyDown: (event) => {
            var _a;
            (_a = childProps.onKeyDown) === null || _a === void 0 ? void 0 : _a.call(childProps, event);
            if (event.key === "Escape")
                hide();
        },
    };
    let trigger;
    if (isDisabled) {
        trigger = (_jsx("span", Object.assign({ ref: (node) => {
                triggerRef.current = node;
            }, tabIndex: 0, "aria-describedby": open ? tooltipId : undefined, className: "inline-flex cursor-not-allowed" }, eventHandlers, { children: _createElement(TriggerComponent, Object.assign({}, childProps, { key: child.key, ref: (node) => {
                    assignRef(childProps.ref, node);
                }, tabIndex: -1, style: { pointerEvents: "none" } })) })));
    }
    else {
        trigger = (_createElement(TriggerComponent, Object.assign({}, childProps, { key: child.key, ref: (node) => {
                triggerRef.current = node;
                assignRef(childProps.ref, node);
            }, "aria-describedby": open ? tooltipId : undefined }, eventHandlers)));
    }
    const activeSide = (coords === null || coords === void 0 ? void 0 : coords.activeSide) || side;
    const arrowOffset = (_a = coords === null || coords === void 0 ? void 0 : coords.arrowOffset) !== null && _a !== void 0 ? _a : 0;
    const portalContent = open && mounted
        ? createPortal(_jsxs("div", { ref: tooltipRef, role: "tooltip", id: tooltipId, style: {
                position: "fixed",
                top: coords ? `${coords.top}px` : "-9999px",
                left: coords ? `${coords.left}px` : "-9999px",
                width: "max-content",
                maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
                zIndex: 999999,
            }, className: cn("pointer-events-none rounded-lg border px-3 py-2 font-medium text-foreground transition-opacity motion-feedback break-words whitespace-normal leading-relaxed", TEXT_SIZE.xs, TOOLTIP_FILL, SURFACE_SHADOW.overlay, coords ? "opacity-100 scale-100" : "opacity-0 scale-95"), children: [content, _jsx("span", { "aria-hidden": "true", className: cn("absolute size-2 pointer-events-none", TOOLTIP_FILL, activeSide === "top" && "bottom-[-4.5px] border-r border-b", activeSide === "bottom" && "top-[-4.5px] border-l border-t", activeSide === "left" && "right-[-4.5px] border-t border-r", activeSide === "right" && "left-[-4.5px] border-b border-l"), style: activeSide === "top" || activeSide === "bottom"
                        ? { left: `calc(50% + ${arrowOffset}px)`, transform: "translateX(-50%) rotate(45deg)" }
                        : { top: `calc(50% + ${arrowOffset}px)`, transform: "translateY(-50%) rotate(45deg)" } })] }), document.body)
        : null;
    return (_jsxs(_Fragment, { children: [trigger, portalContent] }));
}
