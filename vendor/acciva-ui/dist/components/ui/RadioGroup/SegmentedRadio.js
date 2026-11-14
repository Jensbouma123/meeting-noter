"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { CONTROL_HEIGHT, CONTROL_PADDING_X, TAB_RADIUS, TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { useRadioGroupContext } from "./context.js";
/**
 * One segment of a `variant="segmented"` group. Still a `role="radio"` button; the
 * checked segment is a raised fill plus `font-semibold`, so colour is never the only
 * signal (SC 1.4.1). Height comes from `CONTROL_HEIGHT`, never below 24px (SC 2.5.8).
 */
export const SegmentedRadio = forwardRef(function SegmentedRadio({ label, checked, disabled, className, ...props }, ref) {
    const { size } = useRadioGroupContext("Radio");
    return (_jsx("button", { ref: ref, type: "button", role: "radio", "aria-checked": checked, "aria-disabled": disabled || undefined, tabIndex: checked ? 0 : -1, disabled: disabled, className: cn("focus-ring inline-flex flex-1 select-none items-center justify-center whitespace-nowrap transition-colors motion-feedback", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_PADDING_X), resolveResponsive(size, TAB_RADIUS), resolveResponsive(size, TEXT_SIZE), checked ? "bg-background font-semibold text-foreground shadow-sm" : "font-medium text-muted-foreground hover:text-foreground", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className), ...props, children: label }));
});
