"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { isValidElement, useId, useRef } from "react";
import { SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
import { assignRef } from "./assignRef.js";
import { TOOLTIP_FILL } from "./constants.js";
import { PopoverAction, PopoverBody, PopoverHeader } from "./PopoverParts.js";
import { usePopoverFocus } from "./usePopoverFocus.js";
import { usePopoverOpen } from "./usePopoverOpen.js";
import { usePopoverPlacement } from "./usePopoverPlacement.js";
export function Popover({ content, title, open: controlledOpen, defaultOpen = false, onOpenChange, onClose, dismissOnOutsideClick = false, actionLabel, onAction, placement, side, children, anchorRef, maxWidth = 320, className, animated = true, }) {
    const baseId = useId();
    const popoverId = `${baseId}-popover`;
    const titleId = `${baseId}-title`;
    const contentId = `${baseId}-content`;
    // Unique per instance: the trigger declares it, the card anchors to it (useId characters are not dashed-ident safe).
    const anchorName = `--popover-${baseId.replace(/[^\w-]/g, "")}`;
    const internalTriggerRef = useRef(null);
    const triggerRef = anchorRef ?? internalTriggerRef;
    const popoverRef = useRef(null);
    const targetPlacement = placement ?? side ?? "top";
    const [open, mounted, handleClose, setOpenState] = usePopoverOpen(controlledOpen, defaultOpen, onOpenChange, onClose, animated, popoverRef);
    // Side the card actually landed on after a position-try flip; drives the arrow.
    const placed = usePopoverPlacement(open, targetPlacement, triggerRef, anchorName, popoverRef);
    const handlePopoverKeyDown = usePopoverFocus(open, triggerRef, popoverRef, handleClose);
    let triggerNode = null;
    if (children && isValidElement(children)) {
        const child = children;
        const childProps = child.props;
        const TriggerComponent = child.type;
        triggerNode = (_createElement(TriggerComponent, { ...childProps, key: child.key, ref: (node) => {
                internalTriggerRef.current = node;
                assignRef(childProps.ref, node);
            }, "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": open ? popoverId : undefined, 
            // Invoker of an `auto` popover: light dismiss ignores it, so its click is a plain toggle.
            // Declared while closed too: WebKit treats the opening click as an outside click (closing the card at once) unless the trigger is the card's invoker.
            popoverTarget: dismissOnOutsideClick ? popoverId : undefined, popoverTargetAction: dismissOnOutsideClick ? "show" : undefined, onClick: (e) => {
                childProps.onClick?.(e);
                setOpenState(!open);
            } }));
    }
    const resolvedMaxWidth = typeof maxWidth === "number"
        ? `min(${maxWidth}px, calc(100vw - 24px))`
        : `min(${maxWidth}, calc(100vw - 24px))`;
    const card = mounted ? (_jsxs("div", { ref: popoverRef, role: "dialog", id: popoverId, popover: dismissOnOutsideClick ? "auto" : "manual", tabIndex: -1, "aria-modal": "false", "aria-labelledby": title ? titleId : undefined, "aria-describedby": contentId, onKeyDown: handlePopoverKeyDown, 
        // Native light dismiss / Escape hides an `auto` popover without React knowing: sync it back.
        onToggle: (e) => {
            if (e.newState === "closed" && open)
                handleClose();
        }, "data-state": open ? "open" : "closed", "data-side": targetPlacement, "data-placed": placed, style: { positionAnchor: anchorName, maxWidth: resolvedMaxWidth }, className: cn("popover-card rounded-lg border p-3.5 text-foreground leading-relaxed outline-hidden", TOOLTIP_FILL, SURFACE_SHADOW.overlay, animated
            ? "transition-[opacity,scale] motion-spatial ease-emphasized motion-reduce:transition-none"
            : "transition-none", !open && "pointer-events-none", className), children: [_jsx(PopoverHeader, { title: title, titleId: titleId, onClose: handleClose }), _jsx(PopoverBody, { id: contentId, hasTitle: !!title, children: content }), actionLabel && _jsx(PopoverAction, { label: actionLabel, onAction: () => {
                    onAction?.();
                    handleClose();
                } })] })) : null;
    return (_jsxs(_Fragment, { children: [triggerNode, card] }));
}
