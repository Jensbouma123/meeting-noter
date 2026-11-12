"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { isValidElement, useId, useRef } from "react";
import { assignRef } from "./refs.js";
import { TEXT_SIZE } from "../../../lib/sizing-tokens/index.js";
import { SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
import { TOOLTIP_FILL } from "./constants.js";
import { useTooltipBubble } from "./useTooltipBubble.js";
import { useTriggerHandlers } from "./useTriggerHandlers.js";
import { useTooltipOpen } from "./useTooltipOpen.js";
export function Tooltip({ content, children, side = "top", delay = 0, maxWidth = 280, longPress = true }) {
    const tooltipId = useId();
    // Unique per instance: the trigger declares it, the bubble anchors to it (useId characters are not dashed-ident safe).
    const anchorName = `--tooltip-${tooltipId.replace(/[^\w-]/g, "")}`;
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const [open, show, hide, leave, touch, touchOpenRef] = useTooltipOpen(delay, longPress, triggerRef);
    const placed = useTooltipBubble(open, side, triggerRef, tooltipRef, hide, touchOpenRef);
    // Read before the early return so the hook runs on every render; the handlers are unused when `children` is not an element.
    const childProps = (isValidElement(children) ? children.props : {});
    const eventHandlers = useTriggerHandlers(childProps, show, hide, leave, touch);
    if (!isValidElement(children))
        return children;
    const child = children;
    const anchorStyle = open ? { anchorName } : undefined;
    const TriggerComponent = child.type;
    const isDisabled = Boolean(childProps.disabled);
    let trigger;
    if (isDisabled) {
        trigger = (_jsx("span", { ref: (node) => {
                triggerRef.current = node;
            }, tabIndex: 0, "aria-describedby": open ? tooltipId : undefined, style: anchorStyle, className: "inline-flex cursor-not-allowed", ...eventHandlers, children: _createElement(TriggerComponent, { ...childProps, key: child.key, ref: (node) => {
                    assignRef(childProps.ref, node);
                }, tabIndex: -1, style: { pointerEvents: "none" } }) }));
    }
    else {
        trigger = (_createElement(TriggerComponent, { ...childProps, key: child.key, ref: (node) => {
                triggerRef.current = node;
                assignRef(childProps.ref, node);
            }, "aria-describedby": open ? tooltipId : undefined, style: { ...childProps.style, ...anchorStyle }, ...eventHandlers }));
    }
    return (_jsxs(_Fragment, { children: [trigger, open ? (_jsx("div", { ref: tooltipRef, role: "tooltip", id: tooltipId, popover: "manual", "data-side": side, "data-placed": placed, style: {
                    positionAnchor: anchorName,
                    maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
                }, className: cn("tooltip rounded-lg border border-solid px-3 py-2 font-medium text-foreground break-words whitespace-normal leading-relaxed", TEXT_SIZE.xs, TOOLTIP_FILL, SURFACE_SHADOW.overlay), children: content })) : null] }));
}
