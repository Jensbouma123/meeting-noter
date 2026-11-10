"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useId } from "react";
import { CONTROL_GAP, CONTROL_RADIUS, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../../lib/sizing-tokens/index.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { useRadioGroupContext } from "./context.js";
import { RadioCircle } from "./RadioGroupParts.js";
export const Radio = forwardRef(function Radio({ value, label, description, disabled = false, variant, card = false, id, className, ...props }, ref) {
    const resolvedVariant = variant ?? (card ? "card" : "default");
    const generatedId = useId();
    const radioId = id ?? generatedId;
    const labelId = `${radioId}-label`;
    const descriptionId = description ? `${radioId}-desc` : undefined;
    const { value: groupValue, onChange, size, disabled: groupDisabled } = useRadioGroupContext("Radio");
    const isChecked = groupValue === value;
    const isEffectiveDisabled = groupDisabled || disabled;
    const baseSize = typeof size === "string" ? size : size.base;
    const handleClick = useCallback(() => {
        if (isEffectiveDisabled)
            return;
        onChange(value);
    }, [isEffectiveDisabled, onChange, value]);
    if (resolvedVariant === "card") {
        return (_jsxs("button", { ref: ref, id: radioId, type: "button", role: "radio", "aria-checked": isChecked, "aria-disabled": isEffectiveDisabled || undefined, "aria-labelledby": label ? labelId : undefined, "aria-describedby": descriptionId, tabIndex: isChecked ? 0 : -1, disabled: isEffectiveDisabled, onClick: handleClick, className: cn("focus-ring relative flex w-full items-start text-left border bg-surface transition-all motion-feedback active:scale-99", resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, CONTROL_GAP), isChecked
                ? "border-primary-500 bg-primary-500/5 ring-1 ring-primary-500/20 dark:bg-primary-500/10"
                : "border-border hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2", isEffectiveDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", baseSize === "sm" || baseSize === "xs" || baseSize === "xxs" ? "p-3" : "p-4", className), ...props, children: [_jsx("span", { className: "mt-0.5", children: _jsx(RadioCircle, { size: size, isChecked: isChecked, isDisabled: isEffectiveDisabled }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [label ? (_jsx("span", { id: labelId, className: cn("block font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: label })) : null, description ? (_jsx("span", { id: descriptionId, className: "mt-0.5 block text-xs text-muted-foreground", children: description })) : null] })] }));
    }
    return (_jsxs("button", { ref: ref, id: radioId, type: "button", role: "radio", "aria-checked": isChecked, "aria-disabled": isEffectiveDisabled || undefined, "aria-labelledby": label ? labelId : undefined, "aria-describedby": descriptionId, tabIndex: isChecked ? 0 : -1, disabled: isEffectiveDisabled, onClick: handleClick, className: cn("focus-ring group inline-flex items-center text-left transition-colors motion-feedback active:scale-97 select-none", resolveResponsive(size, CONTROL_GAP), typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined, isEffectiveDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className), ...props, children: [_jsx(RadioCircle, { size: size, isChecked: isChecked, isDisabled: isEffectiveDisabled }), label || description ? (_jsxs(VStack, { as: "span", spacing: "none", children: [label ? (_jsx("span", { id: labelId, className: cn("font-medium text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400", resolveResponsive(size, TEXT_SIZE)), children: label })) : null, description ? (_jsx("span", { id: descriptionId, className: "text-xs text-muted-foreground", children: description })) : null] })) : null] }));
});
