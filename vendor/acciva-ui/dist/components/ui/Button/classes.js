import { cn } from "../../../lib/utils.js";
import { BUTTON_ICON_SCALE } from "./iconScale.js";
import { CONTROL_GAP, CONTROL_HEIGHT, CONTROL_PADDING_X, CONTROL_RADIUS, CONTROL_WIDTH, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../../lib/sizing-tokens/index.js";
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
export function buttonRootClass(variant, size, iconOnly, className) {
    const geometry = variantGeometry[variant] === "text"
        ? cn("h-auto min-h-6 p-0", TOUCH_TARGET_CLASS)
        : cn(resolveResponsive(size, CONTROL_HEIGHT), iconOnly ? cn(resolveResponsive(size, CONTROL_WIDTH), "justify-center p-0") : resolveResponsive(size, CONTROL_PADDING_X), typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined);
    return cn("focus-ring inline-flex items-center rounded-lg font-medium transition-colors motion-feedback", "disabled:cursor-not-allowed disabled:opacity-60", "aria-disabled:cursor-not-allowed aria-disabled:opacity-60", variantClasses[variant], resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, CONTROL_GAP), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, BUTTON_ICON_SCALE), geometry, className);
}
