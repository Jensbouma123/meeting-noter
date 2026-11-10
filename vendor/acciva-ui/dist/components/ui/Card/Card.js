import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cloneElement, forwardRef, isValidElement, } from "react";
import { composeSlotProps } from "../../../lib/slot-props.js";
import { cn } from "../../../lib/utils.js";
import { HIGHLIGHT_RING, INTERACTIVE_AFFORDANCE, SELECTED_SURFACE, paddingClasses, surfaceClasses } from "./cardClasses.js";
export const Card = forwardRef(function Card({ variant = "default", interactive = false, padding = "md", className, children, href, target, rel, asChild = false, selected, onSelectedChange, selectionMode = "single", name, value, disabled = false, highlighted = false, ...props }, ref) {
    const surface = variant === "interactive" ? "default" : variant;
    const isLink = typeof href === "string";
    const carriesAffordance = interactive || variant === "interactive" || isLink || asChild;
    const surfaceClassName = cn("relative rounded-xl transition-all motion-feedback", surfaceClasses[surface], paddingClasses[padding], carriesAffordance && INTERACTIVE_AFFORDANCE, highlighted && HIGHLIGHT_RING, className);
    if (variant === "selectable") {
        const handleChange = (event) => {
            onSelectedChange?.(event.currentTarget.checked);
        };
        return (_jsxs("label", { ref: ref, className: cn("relative block", disabled ? "cursor-not-allowed" : "cursor-pointer"), ...props, children: [_jsx("input", { type: selectionMode === "multiple" ? "checkbox" : "radio", name: name, value: value, checked: selected, disabled: disabled, onChange: handleChange, className: "peer sr-only" }), _jsx("span", { className: cn("relative block rounded-xl transition-all motion-feedback focus-within:outline-none", surfaceClasses.selectable, paddingClasses[padding], !disabled && INTERACTIVE_AFFORDANCE, highlighted && !selected && HIGHLIGHT_RING, "peer-checked:border-primary-500 peer-checked:ring-1 peer-checked:ring-primary-500 peer-checked:bg-primary-500/10", "dark:peer-checked:border-primary-400 dark:peer-checked:ring-primary-400 dark:peer-checked:bg-primary-400/15", "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500", "peer-disabled:cursor-not-allowed peer-disabled:opacity-60", selected && SELECTED_SURFACE, className), children: children })] }));
    }
    if (asChild) {
        if (!isValidElement(children)) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[Card] `asChild` requires exactly one React element child to merge into.");
            }
            return null;
        }
        const child = children;
        return cloneElement(child, {
            ...composeSlotProps(child.props, props),
            ref,
            className: cn("focus-ring", surfaceClassName, child.props.className),
        });
    }
    if (isLink) {
        return (_jsx("a", { ref: ref, href: href, target: target, 
            // An external target without `rel` leaks window.opener to the destination.
            rel: rel ?? (target === "_blank" ? "noopener noreferrer" : undefined), className: cn("focus-ring block", surfaceClassName), ...props, children: children }));
    }
    return (_jsx("div", { ref: ref, className: surfaceClassName, ...props, children: children }));
});
