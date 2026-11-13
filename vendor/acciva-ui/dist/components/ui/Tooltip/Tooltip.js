"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { isValidElement, useContext, useId, useRef } from "react";
import { assignRef } from "./refs.js";
import { TooltipGroupContext } from "./groupApi.js";
import { TooltipBubble } from "./TooltipBubble.js";
import { useGroupSlot } from "./useGroupSlot.js";
import { useTriggerHandlers } from "./useTriggerHandlers.js";
import { useTooltipOpen } from "./useTooltipOpen.js";
export function Tooltip({ content, children, side = "top", delay = 0, maxWidth = 280, longPress = true }) {
    const tooltipId = useId();
    // Unique per instance: the trigger declares it, the bubble anchors to it (useId characters are not dashed-ident safe).
    const anchorName = `--tooltip-${tooltipId.replace(/[^\w-]/g, "")}`;
    const triggerRef = useRef(null);
    const group = useContext(TooltipGroupContext);
    const [open, show, hide, leave, touch, touchOpenRef, owner] = useTooltipOpen(delay, longPress, triggerRef, group?.warm);
    const slot = { owner, id: tooltipId, anchorName, content, side, maxWidth, triggerRef, hide, touchOpenRef };
    // Inside a TooltipGroup the group renders the one shared bubble; this instance only feeds it.
    useGroupSlot(group, open, slot);
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
    return (_jsxs(_Fragment, { children: [trigger, open && !group ? _jsx(TooltipBubble, { ...slot }) : null] }));
}
