"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { CONTROL_GAP, CONTROL_HEIGHT, CONTROL_PADDING_X, CONTROL_RADIUS, ICON_SCALE_CLASS, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { DEFAULT_LABELS, PROVIDER_DISPLAY_NAMES } from "./SocialButtonLabels.js";
import { resolveProviderClasses } from "./SocialButtonClasses.js";
import { renderProviderMark } from "./SocialButtonParts.js";
export const SocialButton = forwardRef(function SocialButton({ provider, variant, size = "md", label, labelOverride, loading = false, fullWidth = false, disabled, className, "aria-label": ariaLabelProp, ...props }, ref) {
    const rawLabel = labelOverride ?? label ?? DEFAULT_LABELS[provider];
    const providerName = PROVIDER_DISPLAY_NAMES[provider];
    const accessibleName = ariaLabelProp ??
        (rawLabel.toLowerCase().includes(providerName.toLowerCase())
            ? rawLabel
            : `${rawLabel} with ${providerName}`);
    return (_jsxs("button", { ref: ref, type: "button", disabled: disabled || loading, "aria-busy": loading || undefined, "aria-label": accessibleName, className: cn("focus-ring inline-flex items-center justify-center font-medium font-sans transition-colors motion-feedback disabled:cursor-not-allowed disabled:opacity-60", fullWidth && "w-full", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, CONTROL_GAP), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, CONTROL_PADDING_X), resolveResponsive(size, ICON_SCALE_CLASS), typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined, resolveProviderClasses(provider, variant), className), ...props, children: [loading ? (_jsx(Loader2, { className: "animate-spin shrink-0", "aria-hidden": "true" })) : (renderProviderMark(provider, "shrink-0")), _jsx("span", { children: rawLabel })] }));
});
