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
import { cloneElement, forwardRef, isValidElement, } from "react";
import { cn } from "../../lib/utils.js";
const surfaceClasses = {
    default: "bg-surface border border-border shadow-xs",
    elevated: "bg-surface border border-border shadow-md dark:shadow-elevation-2",
    bordered: "bg-transparent border-2 border-border",
    ghost: "bg-surface/60 border border-transparent hover:border-border/60",
    // Nested sub-panel inside an existing Card: recedes against the parent surface instead of
    // stacking another shadow on it.
    inset: "bg-background border border-border",
    selectable: "bg-surface border border-border shadow-xs",
};
/**
 * The hover/press affordance. It is only an affordance — it adds no role, focus or keyboard
 * path, so it must sit on something that already has them (`href`, `asChild`, `selectable`).
 */
const INTERACTIVE_AFFORDANCE = "cursor-pointer hover:border-muted-foreground/60 hover:bg-elevation-2 hover:shadow-md active:border-muted-foreground active:bg-elevation-3 active:scale-[0.99] dark:hover:bg-elevation-3 dark:active:bg-elevation-4";
const SELECTED_SURFACE = "border-primary-500 ring-1 ring-primary-500 bg-primary-500/10 dark:border-primary-400 dark:ring-primary-400 dark:bg-primary-400/15";
/**
 * The highlight ring. `ring-inset` keeps it inside the box, so toggling it never shifts layout
 * (SC 1.4.11 Non-text Contrast, 3:1 against the surface). Same brand role as `SELECTED_SURFACE`.
 */
const HIGHLIGHT_RING = "ring-2 ring-inset ring-primary-500 dark:ring-primary-400";
const paddingClasses = {
    none: "p-0",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
};
export const Card = forwardRef(function Card(_a, ref) {
    var { variant = "default", interactive = false, padding = "md", className, children, href, target, rel, asChild = false, selected, onSelectedChange, selectionMode = "single", name, value, disabled = false, highlighted = false } = _a, props = __rest(_a, ["variant", "interactive", "padding", "className", "children", "href", "target", "rel", "asChild", "selected", "onSelectedChange", "selectionMode", "name", "value", "disabled", "highlighted"]);
    const surface = variant === "interactive" ? "default" : variant;
    const isLink = typeof href === "string";
    const carriesAffordance = interactive || variant === "interactive" || isLink || asChild;
    const surfaceClassName = cn("relative rounded-xl transition-all motion-feedback", surfaceClasses[surface], paddingClasses[padding], carriesAffordance && INTERACTIVE_AFFORDANCE, highlighted && HIGHLIGHT_RING, className);
    if (variant === "selectable") {
        const handleChange = (event) => {
            onSelectedChange === null || onSelectedChange === void 0 ? void 0 : onSelectedChange(event.currentTarget.checked);
        };
        return (_jsxs("label", Object.assign({ ref: ref, className: cn("relative block", disabled ? "cursor-not-allowed" : "cursor-pointer") }, props, { children: [_jsx("input", { type: selectionMode === "multiple" ? "checkbox" : "radio", name: name, value: value, checked: selected, disabled: disabled, onChange: handleChange, className: "peer sr-only" }), _jsx("span", { className: cn("relative block rounded-xl transition-all motion-feedback focus-within:outline-none", surfaceClasses.selectable, paddingClasses[padding], !disabled && INTERACTIVE_AFFORDANCE, highlighted && !selected && HIGHLIGHT_RING, "peer-checked:border-primary-500 peer-checked:ring-1 peer-checked:ring-primary-500 peer-checked:bg-primary-500/10", "dark:peer-checked:border-primary-400 dark:peer-checked:ring-primary-400 dark:peer-checked:bg-primary-400/15", "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500", "peer-disabled:cursor-not-allowed peer-disabled:opacity-60", selected && SELECTED_SURFACE, className), children: children })] })));
    }
    if (asChild) {
        if (!isValidElement(children)) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[Card] `asChild` requires exactly one React element child to merge into.");
            }
            return null;
        }
        const child = children;
        return cloneElement(child, Object.assign(Object.assign({}, props), { ref, className: cn("focus-ring", surfaceClassName, child.props.className) }));
    }
    if (isLink) {
        return (_jsx("a", Object.assign({ ref: ref, href: href, target: target, 
            // An external target without `rel` leaks window.opener to the destination.
            rel: rel !== null && rel !== void 0 ? rel : (target === "_blank" ? "noopener noreferrer" : undefined), className: cn("focus-ring block", surfaceClassName) }, props, { children: children })));
    }
    return (_jsx("div", Object.assign({ ref: ref, className: surfaceClassName }, props, { children: children })));
});
export const CardHeader = forwardRef(function CardHeader(_a, ref) {
    var { className, children, action } = _a, props = __rest(_a, ["className", "children", "action"]);
    return (_jsxs("div", Object.assign({ ref: ref, className: cn("flex items-start justify-between gap-4 pb-3", className) }, props, { children: [_jsx("div", { className: "space-y-1 min-w-0 flex-1", children: children }), action ? _jsx("div", { className: "shrink-0 pt-0.5", children: action }) : null] })));
});
export const CardTitle = forwardRef(function CardTitle(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("h3", Object.assign({ ref: ref, className: cn("text-base sm:text-lg font-semibold text-foreground tracking-tight", className) }, props, { children: children })));
});
export const CardDescription = forwardRef(function CardDescription(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("p", Object.assign({ ref: ref, className: cn("text-xs sm:text-sm text-muted-foreground", className) }, props, { children: children })));
});
export const CardContent = forwardRef(function CardContent(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ ref: ref, className: cn("text-sm text-foreground", className) }, props, { children: children })));
});
export const CardFooter = forwardRef(function CardFooter(_a, ref) {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ ref: ref, className: cn("flex items-center justify-between gap-3 pt-4 border-t border-border/60", className) }, props, { children: children })));
});
