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
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { X } from "lucide-react";
import { BADGE_GAP, BADGE_ICON_SCALE_CLASS, BADGE_PADDING, BADGE_TEXT, CONTROL_HEIGHT, CONTROL_PADDING_X, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
/**
 * Names that identify no particular chip. Rejected outright: these are precisely the labels that
 * turn a filter row into N indistinguishable "Remove" buttons.
 */
const CONTENTLESS_DISMISS_LABELS = new Set([
    "x",
    "close",
    "clear",
    "cancel",
    "remove",
    "dismiss",
    "delete",
    "remove it",
    "remove this",
    "remove item",
    "remove tag",
    "remove chip",
    "remove badge",
    "remove filter",
    "remove this filter",
    "clear filter",
    "delete item",
    "close chip",
]);
function normalizeLabel(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
/**
 * Resolves the dismiss button's accessible name and, outside production, reports the ways it can
 * fail to identify its own chip. It always returns *some* name — a shipped button with no name at
 * all would be a worse outcome than a poorly worded one.
 */
function resolveDismissLabel(dismissLabel, children) {
    var _a;
    const childText = typeof children === "string" ? children.trim() : "";
    const explicit = (_a = dismissLabel === null || dismissLabel === void 0 ? void 0 : dismissLabel.trim()) !== null && _a !== void 0 ? _a : "";
    const resolved = explicit || (childText ? `Remove ${childText}` : "");
    if (process.env.NODE_ENV !== "production") {
        const prefix = '[a11y] <Badge variant="chip" onDismiss>';
        if (!resolved) {
            console.error(`${prefix} needs a \`dismissLabel\`. The dismiss control is icon-only, so it is the button's entire accessible name (WCAG 2.2 AA SC 4.1.2).`);
        }
        else if (dismissLabel !== undefined && !explicit) {
            console.error(`${prefix} was given a blank \`dismissLabel\`; the button fell back to "${resolved}". Pass a real name or drop the prop entirely (WCAG 2.2 AA SC 4.1.2).`);
        }
        else if (explicit && !childText && CONTENTLESS_DISMISS_LABELS.has(normalizeLabel(explicit))) {
            console.error(`${prefix} was given the generic \`dismissLabel\` "${explicit}", which names no particular chip. Several chips in a row would all announce as "${explicit}". Name the chip it removes, e.g. "Remove Pending filter" (WCAG 2.2 AA SC 4.1.2, SC 2.4.6).`);
        }
        else if (explicit && childText && !normalizeLabel(explicit).includes(normalizeLabel(childText))) {
            console.error(`${prefix} has \`dismissLabel\` "${explicit}", which does not mention the chip's own text "${childText}". A screen-reader user hears only the label, so it has to identify which chip it removes (WCAG 2.2 AA SC 4.1.2, SC 2.4.6).`);
        }
    }
    return resolved;
}
const toneClasses = {
    primary: "bg-primary-500/10 text-primary-900 border border-primary-500/20 dark:bg-primary-400/15 dark:text-primary-300 dark:border-primary-400/30",
    secondary: "bg-secondary-500/10 text-secondary-900 border border-secondary-500/20 dark:bg-secondary-400/15 dark:text-secondary-300 dark:border-secondary-400/30",
    accent: "bg-accent-500/10 text-accent-900 border border-accent-500/20 dark:bg-accent-400/15 dark:text-accent-300 dark:border-accent-400/30",
    success: "bg-success/10 text-success-900 border border-success/20 dark:bg-success/15 dark:text-success-300 dark:border-success/30",
    warning: "bg-warning/10 text-warning-950 border border-warning/20 dark:bg-warning/15 dark:text-warning-300 dark:border-warning/30",
    danger: "bg-danger/10 text-danger-900 border border-danger/20 dark:bg-danger/15 dark:text-danger-300 dark:border-danger/30",
    info: "bg-info/10 text-info-900 border border-info/20 dark:bg-info/15 dark:text-info-300 dark:border-info/30",
    neutral: "bg-surface text-foreground border border-border dark:bg-elevation-2 dark:text-foreground dark:border-border",
};
// Tint fill/border follow the tone opacity steps (`/10`→`/15`, `/20`→`/30` in dark mode).
const tintClasses = {
    "chart-1": { surface: "bg-chart-1/10 border-chart-1/20 dark:bg-chart-1/15 dark:border-chart-1/30", dot: "bg-chart-1" },
    "chart-2": { surface: "bg-chart-2/10 border-chart-2/20 dark:bg-chart-2/15 dark:border-chart-2/30", dot: "bg-chart-2" },
    "chart-3": { surface: "bg-chart-3/10 border-chart-3/20 dark:bg-chart-3/15 dark:border-chart-3/30", dot: "bg-chart-3" },
    "chart-4": { surface: "bg-chart-4/10 border-chart-4/20 dark:bg-chart-4/15 dark:border-chart-4/30", dot: "bg-chart-4" },
    "chart-5": { surface: "bg-chart-5/10 border-chart-5/20 dark:bg-chart-5/15 dark:border-chart-5/30", dot: "bg-chart-5" },
    "chart-6": { surface: "bg-chart-6/10 border-chart-6/20 dark:bg-chart-6/15 dark:border-chart-6/30", dot: "bg-chart-6" },
    "chart-7": { surface: "bg-chart-7/10 border-chart-7/20 dark:bg-chart-7/15 dark:border-chart-7/30", dot: "bg-chart-7" },
    "chart-8": { surface: "bg-chart-8/10 border-chart-8/20 dark:bg-chart-8/15 dark:border-chart-8/30", dot: "bg-chart-8" },
};
const dotClasses = {
    primary: "bg-primary-500",
    secondary: "bg-secondary-500",
    accent: "bg-accent-500",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
    neutral: "bg-muted-foreground",
};
const chipDotClasses = {
    unselected: "bg-muted-foreground",
    selected: "bg-primary-500 dark:bg-primary-400",
};
const chipStateClasses = {
    unselected: "border-border bg-surface text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:bg-elevation-2 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
    selected: "border-primary-500 bg-primary-500/10 text-primary-900 hover:bg-primary-500/15 active:bg-primary-500/20 dark:border-primary-400 dark:bg-primary-400/15 dark:text-primary-300",
};
// The chip's right padding collapses when a dismiss button follows the label: the button
// carries its own padding, so the shared control padding would double up.
const CHIP_PADDING_RIGHT_WITH_DISMISS = {
    xxs: "pr-0.5",
    xs: "pr-0.5",
    sm: "pr-1",
    md: "pr-1",
    lg: "pr-1.5",
    xl: "pr-1.5",
    "2xl": "pr-2",
    "3xl": "pr-2",
};
// Never below size-6 (24x24px): the dismiss button is its own target, and SC 2.5.8 applies to
// it independently of the chip that contains it.
const CHIP_DISMISS_SIZE = {
    xxs: "size-6",
    xs: "size-6",
    sm: "size-6",
    md: "size-6",
    lg: "size-7",
    xl: "size-8",
    "2xl": "size-9",
    "3xl": "size-10",
};
export function Badge(_a) {
    var { className, variant = "neutral", size = "md", dot = false, tint, selected = false, onSelect, onDismiss, dismissLabel, disabled = false, children } = _a, props = __rest(_a, ["className", "variant", "size", "dot", "tint", "selected", "onSelect", "onDismiss", "dismissLabel", "disabled", "children"]);
    if (variant !== "chip") {
        return (_jsxs("span", Object.assign({ className: cn("inline-flex items-center rounded-full font-medium", tint ? ["text-foreground border", tintClasses[tint].surface] : toneClasses[variant], resolveResponsive(size, BADGE_PADDING), resolveResponsive(size, BADGE_TEXT), resolveResponsive(size, BADGE_GAP), resolveResponsive(size, BADGE_ICON_SCALE_CLASS), className) }, props, { children: [dot && _jsx("span", { className: cn("size-1.5 rounded-full shrink-0", tint ? tintClasses[tint].dot : dotClasses[variant]) }), children] })));
    }
    const resolvedDismissLabel = onDismiss ? resolveDismissLabel(dismissLabel, children) : undefined;
    const dotNode = dot ? (_jsx("span", { className: cn("size-1.5 rounded-full shrink-0", chipDotClasses[selected ? "selected" : "unselected"]) })) : null;
    const pillClassName = cn("inline-flex shrink-0 items-center rounded-full border font-medium transition-colors", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_PADDING_X), resolveResponsive(size, BADGE_TEXT), resolveResponsive(size, BADGE_GAP), resolveResponsive(size, BADGE_ICON_SCALE_CLASS), chipStateClasses[selected ? "selected" : "unselected"], "disabled:cursor-not-allowed disabled:opacity-60", disabled && "cursor-not-allowed opacity-60", onDismiss && resolveResponsive(size, CHIP_PADDING_RIGHT_WITH_DISMISS), className);
    // A chip that only toggles IS the button, so the whole pill is one target. Add a dismiss
    // control and the pill becomes a plain container instead — two sibling buttons, never one
    // interactive element nested inside another.
    if (onSelect && !onDismiss) {
        return (_jsxs("button", Object.assign({ type: "button", "aria-pressed": selected, disabled: disabled, onClick: () => onSelect(!selected), className: cn("focus-ring", pillClassName, typeof size === "string"
                ? touchTargetClass(size)
                : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                    ? TOUCH_TARGET_CLASS
                    : undefined) }, props, { children: [dotNode, children] })));
    }
    return (_jsxs("span", Object.assign({ className: pillClassName }, props, { children: [onSelect ? (_jsxs("button", { type: "button", "aria-pressed": selected, disabled: disabled, onClick: () => onSelect(!selected), className: cn("focus-ring inline-flex items-center self-stretch rounded-full disabled:cursor-not-allowed", resolveResponsive(size, BADGE_GAP)), children: [dotNode, children] })) : (_jsxs(_Fragment, { children: [dotNode, children] })), onDismiss ? (_jsx("button", { type: "button", "aria-label": resolvedDismissLabel, disabled: disabled, onClick: onDismiss, className: cn("focus-ring inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors motion-feedback hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3 active:text-foreground active:scale-[0.99] disabled:cursor-not-allowed dark:hover:bg-elevation-3 dark:active:bg-elevation-4", resolveResponsive(size, CHIP_DISMISS_SIZE)), children: _jsx(X, { "aria-hidden": "true" }) })) : null] })));
}
