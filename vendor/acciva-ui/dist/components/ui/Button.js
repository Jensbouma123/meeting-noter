"use client";
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
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
import { cloneElement, forwardRef, isValidElement, useEffect, } from "react";
import { Tooltip } from "../../components/ui/Tooltip.js";
import { CONTROL_GAP, CONTROL_HEIGHT, CONTROL_PADDING_X, CONTROL_RADIUS, CONTROL_WIDTH, ICON_SCALE_CLASS, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
/**
 * Dark-mode `primary` brightens on interaction, which walks the fill up the ramp past the
 * point where a white label still clears WCAG 2.2 AA SC 1.4.3 (white on primary-400 is
 * 2.5:1, on primary-300 is 1.7:1, for every seed). The label flips to `primary-950` on those
 * two states instead of darkening the fill, so the "brighter means pressed" affordance
 * survives. `disabled:*` stays last in each string: a disabled button still matches `:hover`,
 * and equal-specificity variants are resolved by source order.
 */
const variantClasses = {
    primary: "bg-primary-600 text-button-primary-foreground hover:bg-primary-700 active:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-400 dark:hover:text-primary-950 dark:active:bg-primary-300 dark:active:text-primary-950 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-primary-400",
    secondary: "bg-secondary-500/10 text-secondary-800 hover:bg-secondary-500/15 active:bg-secondary-500/20 dark:bg-secondary-400/15 dark:text-secondary-300 dark:hover:bg-secondary-400/25 dark:active:bg-secondary-400/30",
    outline: "border border-border bg-transparent text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
    ghost: "bg-transparent text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
    danger: "bg-danger text-danger-foreground hover:brightness-90 active:brightness-75 dark:hover:brightness-110 dark:active:brightness-125",
    link: "bg-transparent text-primary-800 underline-offset-4 hover:underline hover:text-primary-900 active:text-primary-950 dark:text-primary-300 dark:hover:text-primary-200 dark:active:text-primary-100",
};
/**
 * `control` variants are boxes on the shared control scale (fixed height + horizontal padding).
 * `text` variants are typography: they drop the box so they can sit inline in a sentence, and
 * take the invisible 44x44px hit-area expansion at every tier instead of only at xxs/xs.
 */
const variantGeometry = {
    primary: "control",
    secondary: "control",
    outline: "control",
    ghost: "control",
    danger: "control",
    link: "text",
};
export const Button = forwardRef(function Button(_a, ref) {
    var { className, variant = "primary", size = "md", loading = false, disabled, leadingIcon, trailingIcon, iconOnly = false, tooltip, children, href, target, rel, download, asChild = false, onClick, "aria-label": ariaLabel } = _a, props = __rest(_a, ["className", "variant", "size", "loading", "disabled", "leadingIcon", "trailingIcon", "iconOnly", "tooltip", "children", "href", "target", "rel", "download", "asChild", "onClick", "aria-label"]);
    const hasTooltip = typeof tooltip === "string" && tooltip.trim().length > 0;
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (!iconOnly || hasTooltip)
            return;
        console.error("[a11y] <Button iconOnly> requires a non-blank `tooltip`. It is the button's only text: it renders the tooltip and supplies the accessible name (WCAG 2.2 AA SC 4.1.2).");
    }, [iconOnly, hasTooltip]);
    // Loading always keeps exactly one icon slot occupied by the spinner: the side that
    // actually has an icon, defaulting to leading when both or neither are set.
    const spinnerTrailing = loading && !leadingIcon && Boolean(trailingIcon);
    const spinner = _jsx(Loader2, { className: "animate-spin", "aria-hidden": "true" });
    const leadingSlot = loading && !spinnerTrailing ? spinner : leadingIcon;
    const trailingSlot = spinnerTrailing ? spinner : loading ? null : trailingIcon;
    const inert = Boolean(disabled) || loading;
    const resolvedAriaLabel = ariaLabel !== null && ariaLabel !== void 0 ? ariaLabel : (iconOnly ? tooltip : undefined);
    const geometry = variantGeometry[variant] === "text"
        ? cn("h-auto min-h-6 p-0", TOUCH_TARGET_CLASS)
        : cn(resolveResponsive(size, CONTROL_HEIGHT), iconOnly
            ? cn(resolveResponsive(size, CONTROL_WIDTH), "justify-center p-0")
            : resolveResponsive(size, CONTROL_PADDING_X), typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined);
    const rootClassName = cn("focus-ring inline-flex items-center rounded-lg font-medium transition-colors motion-feedback", "disabled:cursor-not-allowed disabled:opacity-60", "aria-disabled:cursor-not-allowed aria-disabled:opacity-60", variantClasses[variant], resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, CONTROL_GAP), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, ICON_SCALE_CLASS), geometry, className);
    // An <a> cannot be `disabled`; it is taken out of the tab order and its activation is
    // swallowed instead, so a loading/disabled link is inert for pointer AND keyboard users.
    const handleInertClick = (event) => {
        event.preventDefault();
    };
    if (asChild) {
        if (!isValidElement(children)) {
            if (process.env.NODE_ENV !== "production") {
                console.error("[Button] `asChild` requires exactly one React element child to merge into.");
            }
            return null;
        }
        const child = children;
        return withTooltip(cloneElement(child, Object.assign(Object.assign({}, props), { ref, className: cn(rootClassName, child.props.className), "aria-label": resolvedAriaLabel !== null && resolvedAriaLabel !== void 0 ? resolvedAriaLabel : child.props["aria-label"], "aria-busy": loading || undefined, "aria-disabled": inert || undefined, tabIndex: inert ? -1 : child.props.tabIndex, onClick: inert ? handleInertClick : onClick, children: (_jsxs(_Fragment, { children: [leadingSlot, child.props.children, trailingSlot] })) })), hasTooltip, tooltip);
    }
    if (typeof href === "string") {
        return withTooltip(_jsxs("a", Object.assign({ ref: ref, href: inert ? undefined : href, target: target, 
            // An external target without `rel` leaks window.opener to the destination.
            rel: rel !== null && rel !== void 0 ? rel : (target === "_blank" ? "noopener noreferrer" : undefined), download: download, role: inert ? "link" : undefined, tabIndex: inert ? -1 : undefined, "aria-busy": loading || undefined, "aria-disabled": inert || undefined, "aria-label": resolvedAriaLabel, onClick: inert ? handleInertClick : onClick, className: rootClassName }, props, { children: [leadingSlot, children, trailingSlot] })), hasTooltip, tooltip);
    }
    return withTooltip(_jsxs("button", Object.assign({ ref: ref, disabled: inert, "aria-busy": loading || undefined, "aria-label": resolvedAriaLabel, onClick: onClick, className: rootClassName }, props, { children: [leadingSlot, children, trailingSlot] })), hasTooltip, tooltip);
});
function withTooltip(element, hasTooltip, tooltip) {
    if (!hasTooltip || tooltip === undefined)
        return element;
    return _jsx(Tooltip, { content: tooltip, children: element });
}
