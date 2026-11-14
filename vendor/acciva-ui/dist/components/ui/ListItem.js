"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { cloneElement, forwardRef, isValidElement, } from "react";
import { mergeRefs } from "../../lib/mergeRefs.js";
import { composeSlotProps } from "../../lib/slot-props.js";
import { cn } from "../../lib/utils.js";
const rowClass = cn("focus-ring motion-feedback flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors", "hover:bg-primary-500/8 dark:hover:bg-primary-400/15", "active:bg-primary-500/15", "disabled:cursor-not-allowed disabled:opacity-60");
// Square 44px target (SC 2.5.8), icon centred; no padding so the square stays square.
const railClass = "size-11 min-h-11 w-11 justify-center gap-0 px-0 py-0";
const activeClass = "bg-primary-500/10 dark:bg-primary-500/15";
export const ListItem = forwardRef(function ListItem({ title, subtitle, leading, trailing, selected, checked, depth = 0, density = "default", asChild = false, type = "button", className, style, children, ...rest }, ref) {
    const rail = density === "rail";
    const rowStyle = {
        // Token-derived indent: one xl spacing step (6 units) per outline level.
        paddingInlineStart: !rail && depth > 0 ? `calc(var(--spacing) * 6 * ${depth} + var(--spacing) * 3)` : undefined,
        ...style,
    };
    const content = rail ? (_jsxs(_Fragment, { children: [leading ? _jsx("span", { "aria-hidden": "true", className: "flex shrink-0 items-center", children: leading }) : null, _jsx("span", { className: "sr-only", children: title })] })) : (_jsxs(_Fragment, { children: [leading ? _jsx("span", { className: "flex shrink-0 items-center", children: leading }) : null, _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-sm font-medium text-foreground", children: title }), subtitle ? (_jsx("span", { className: "block truncate text-xs text-muted-foreground", children: subtitle })) : null] }), trailing ? _jsx("span", { className: "flex shrink-0 items-center", children: trailing }) : null] }));
    if (asChild) {
        if (!isValidElement(children)) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[ListItem] `asChild` requires exactly one React element child to merge into.");
            }
            return null;
        }
        const child = children;
        // A link row is navigation, not a form control: `type`, `disabled` and `checked` stay off it.
        const { disabled: _disabled, ...linkRest } = rest;
        return cloneElement(child, {
            ...composeSlotProps(child.props, linkRest),
            ref: mergeRefs(ref, child.props.ref),
            "aria-current": selected ? "page" : child.props["aria-current"],
            "data-selected": selected || undefined,
            className: cn(rowClass, rail && railClass, selected && activeClass, className, child.props.className),
            style: { ...rowStyle, ...child.props.style },
            children: content,
        });
    }
    const checkable = checked !== undefined;
    const isActive = checkable ? checked : selected === true;
    return (_jsx("button", { ref: ref, type: type, role: checkable ? "checkbox" : undefined, "aria-checked": checkable ? checked : undefined, "aria-current": !checkable && selected ? "true" : undefined, "data-selected": isActive || undefined, className: cn(rowClass, rail && railClass, isActive && activeClass, className), style: rowStyle, ...rest, children: content }));
});
