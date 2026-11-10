"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
import { SWITCH_THUMB, SWITCH_THUMB_TRANSLATE, SWITCH_TRACK, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens/index.js";
import { cn } from "../../lib/utils.js";
export function Switch({ checked, onCheckedChange, label, disabled = false, id, size = "md", className, "aria-label": ariaLabel, ...props }) {
    const generatedId = useId();
    const switchId = id ?? generatedId;
    const labelId = `${switchId}-label`;
    const handleKeyDown = (event) => {
        if (event.key !== "Enter" && event.key !== " ")
            return;
        event.preventDefault();
        if (disabled)
            return;
        onCheckedChange(!checked);
    };
    return (_jsxs("span", { className: cn("inline-flex select-none items-center gap-2.5 text-foreground", resolveResponsive(size, TEXT_SIZE), disabled && "opacity-60", className), ...props, children: [_jsx("button", { id: switchId, type: "button", role: "switch", "aria-checked": checked, "aria-label": label ? undefined : ariaLabel, "aria-labelledby": label ? labelId : undefined, disabled: disabled, onClick: () => onCheckedChange(!checked), onKeyDown: handleKeyDown, className: cn("focus-ring relative inline-flex min-h-6 shrink-0 cursor-pointer items-center rounded-full disabled:cursor-not-allowed", typeof size === "string"
                    ? touchTargetClass(size)
                    : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                        ? TOUCH_TARGET_CLASS
                        : undefined), children: _jsx("span", { "aria-hidden": "true", className: cn("inline-flex items-center rounded-full transition-colors motion-feedback", resolveResponsive(size, SWITCH_TRACK), checked ? "bg-primary-500" : "bg-muted-foreground/30"), children: _jsx("span", { className: cn("pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 transition-transform motion-feedback ease-in-out", resolveResponsive(size, SWITCH_THUMB), checked ? resolveResponsive(size, SWITCH_THUMB_TRANSLATE) : "translate-x-0") }) }) }), label ? (_jsx("label", { id: labelId, htmlFor: switchId, onClick: (event) => {
                    event.preventDefault();
                    if (!disabled)
                        onCheckedChange(!checked);
                }, className: cn("font-medium", disabled ? "cursor-not-allowed" : "cursor-pointer"), children: label })) : null] }));
}
