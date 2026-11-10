"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
import { cloneElement, forwardRef, isValidElement, useCallback, useRef } from "react";
import { useMissingLabelWarning } from "../../../lib/a11y-dev.js";
import { useLongPress } from "../../../lib/use-long-press.js";
import { inertClick, withTooltip } from "./ButtonParts.js";
import { chainClick, chainPress } from "./pressHandlers.js";
import { buttonRootClass } from "./classes.js";
import { composeSlotProps } from "../../../lib/slot-props.js";
import { cn } from "../../../lib/utils.js";
import { useButtonWarning } from "./useButtonWarning.js";
export const Button = forwardRef(function Button({ className, variant = "primary", size = "md", loading = false, disabled, leadingIcon, trailingIcon, iconOnly = false, tooltip, children, href, target, rel, download, asChild = false, onClick, onLongPress, "aria-label": ariaLabel, ...props }, ref) {
    const hasTooltip = typeof tooltip === "string" && tooltip.trim().length > 0;
    useButtonWarning(iconOnly, hasTooltip);
    // Loading always keeps exactly one icon slot occupied by the spinner: the side that
    // actually has an icon, defaulting to leading when both or neither are set.
    const spinnerTrailing = loading && !leadingIcon && Boolean(trailingIcon);
    const spinner = _jsx(Loader2, { className: "animate-spin", "aria-hidden": "true" });
    const leadingSlot = loading && !spinnerTrailing ? spinner : leadingIcon;
    const trailingSlot = spinnerTrailing ? spinner : loading ? null : trailingIcon;
    const inert = Boolean(disabled) || loading;
    const innerRef = useRef(null);
    const setRef = useCallback((node) => {
        innerRef.current = node;
        if (typeof ref === "function")
            ref(node);
        else if (ref)
            ref.current = node;
    }, [ref]);
    useMissingLabelWarning("Button", innerRef);
    const press = useLongPress(Boolean(onLongPress) && !inert, () => onLongPress?.());
    const pressProps = onLongPress ? chainPress(press, props) : undefined;
    const handleClick = onLongPress ? chainClick(press, onClick) : onClick;
    const rootClassName = buttonRootClass(variant, size, iconOnly, className);
    const shownTooltip = hasTooltip ? tooltip : undefined;
    const label = ariaLabel ?? (iconOnly ? tooltip : undefined);
    if (asChild) {
        if (!isValidElement(children)) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[Button] `asChild` requires exactly one React element child to merge into.");
            }
            return null;
        }
        const child = children;
        return withTooltip(cloneElement(child, {
            ...composeSlotProps(child.props, { ...props, ...pressProps, onClick: handleClick }),
            ref: setRef,
            className: cn(rootClassName, child.props.className),
            "aria-label": label ?? child.props["aria-label"],
            "aria-busy": loading || undefined,
            "aria-disabled": inert || undefined,
            tabIndex: inert ? -1 : child.props.tabIndex,
            ...(inert && { onClick: inertClick }),
            children: (_jsxs(_Fragment, { children: [leadingSlot, child.props.children, trailingSlot] })),
        }), shownTooltip, !!onLongPress);
    }
    if (typeof href === "string") {
        // An external target without `rel` leaks window.opener to the destination.
        return withTooltip(_jsxs("a", { ref: setRef, href: inert ? undefined : href, target: target, rel: rel ?? (target === "_blank" ? "noopener noreferrer" : undefined), download: download, role: inert ? "link" : undefined, tabIndex: inert ? -1 : undefined, "aria-busy": loading || undefined, "aria-disabled": inert || undefined, "aria-label": label, onClick: inert ? inertClick : handleClick, className: rootClassName, ...props, ...pressProps, children: [leadingSlot, children, trailingSlot] }), shownTooltip, !!onLongPress);
    }
    return withTooltip(_jsxs("button", { ref: setRef, disabled: inert, "aria-busy": loading || undefined, "aria-label": label, onClick: handleClick, className: rootClassName, ...props, ...pressProps, children: [leadingSlot, children, trailingSlot] }), shownTooltip, !!onLongPress);
});
