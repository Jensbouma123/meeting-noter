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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, forwardRef, useCallback, useContext, useId, useRef, } from "react";
import { CONTROL_GAP, CONTROL_RADIUS, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { VStack } from "./VStack.js";
const RadioGroupContext = createContext(null);
function useRadioGroupContext(component) {
    const ctx = useContext(RadioGroupContext);
    if (!ctx) {
        throw new Error(`<${component}> must be used within a <RadioGroup>`);
    }
    return ctx;
}
export const RadioGroup = forwardRef(function RadioGroup(_a, ref) {
    var { value, onChange, name, label, hint, error, orientation = "vertical", size = "md", disabled = false, required = false, className, children, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy } = _a, props = __rest(_a, ["value", "onChange", "name", "label", "hint", "error", "orientation", "size", "disabled", "required", "className", "children", "aria-label", "aria-labelledby", "aria-describedby"]);
    const generatedId = useId();
    const groupName = name !== null && name !== void 0 ? name : `${generatedId}-radio-group`;
    const labelId = `${generatedId}-label`;
    const hintId = hint && !error ? `${generatedId}-hint` : undefined;
    const errorId = error ? `${generatedId}-error` : undefined;
    const groupRef = useRef(null);
    const describedByIds = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const handleKeyDown = (event) => {
        const group = groupRef.current;
        if (!group)
            return;
        const radios = Array.from(group.querySelectorAll('[role="radio"]:not([aria-disabled="true"])'));
        if (radios.length === 0)
            return;
        const currentIndex = radios.findIndex((r) => r === document.activeElement);
        if (currentIndex === -1)
            return;
        let nextIndex = null;
        switch (event.key) {
            case "ArrowDown":
            case "ArrowRight":
                nextIndex = (currentIndex + 1) % radios.length;
                break;
            case "ArrowUp":
            case "ArrowLeft":
                nextIndex = (currentIndex - 1 + radios.length) % radios.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = radios.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        const target = radios[nextIndex];
        target.focus();
        target.click();
    };
    return (_jsx(RadioGroupContext.Provider, { value: {
            name: groupName,
            value,
            onChange,
            size,
            disabled,
            orientation,
        }, children: _jsxs(VStack, Object.assign({ ref: (element) => {
                const node = element;
                groupRef.current = node;
                if (typeof ref === "function")
                    ref(node);
                else if (ref)
                    ref.current = node;
            }, role: "radiogroup", "aria-label": label ? undefined : ariaLabel, "aria-labelledby": label ? labelId : ariaLabelledBy, "aria-describedby": describedByIds, "aria-required": required || undefined, "aria-orientation": orientation, onKeyDown: handleKeyDown, spacing: "sm", className: className }, props, { children: [label ? (_jsxs("span", { id: labelId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsx("div", { className: cn("flex", orientation === "horizontal" ? "flex-row flex-wrap gap-4" : "flex-col gap-2.5"), children: children }), hint && !error ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null, error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : null] })) }));
});
const RADIO_CIRCLE_OUTER = {
    xxs: "size-3.5",
    xs: "size-4",
    sm: "size-4.5",
    md: "size-5",
    lg: "size-5.5",
    xl: "size-6",
    "2xl": "size-7",
    "3xl": "size-8",
};
const RADIO_CIRCLE_INNER = {
    xxs: "size-1.5",
    xs: "size-1.5",
    sm: "size-2",
    md: "size-2",
    lg: "size-2.5",
    xl: "size-2.5",
    "2xl": "size-3",
    "3xl": "size-3.5",
};
export const Radio = forwardRef(function Radio(_a, ref) {
    var { value, label, description, disabled = false, variant, card = false, id, className } = _a, props = __rest(_a, ["value", "label", "description", "disabled", "variant", "card", "id", "className"]);
    const resolvedVariant = variant !== null && variant !== void 0 ? variant : (card ? "card" : "default");
    const generatedId = useId();
    const radioId = id !== null && id !== void 0 ? id : generatedId;
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
    const circle = (_jsx("span", { "aria-hidden": "true", className: cn("relative flex shrink-0 items-center justify-center rounded-full border-2 transition-all motion-feedback", resolveResponsive(size, RADIO_CIRCLE_OUTER), isChecked
            ? "border-primary-500 bg-primary-500 text-button-primary-foreground"
            : "border-border bg-background hover:border-muted-foreground/60 active:border-muted-foreground group-active:border-muted-foreground", isEffectiveDisabled && "opacity-60"), children: _jsx("span", { className: cn("rounded-full bg-white transition-transform motion-feedback", resolveResponsive(size, RADIO_CIRCLE_INNER), isChecked ? "scale-100" : "scale-0") }) }));
    if (resolvedVariant === "card") {
        return (_jsxs("button", Object.assign({ ref: ref, id: radioId, type: "button", role: "radio", "aria-checked": isChecked, "aria-disabled": isEffectiveDisabled || undefined, "aria-labelledby": label ? labelId : undefined, "aria-describedby": descriptionId, tabIndex: isChecked ? 0 : -1, disabled: isEffectiveDisabled, onClick: handleClick, className: cn("focus-ring relative flex w-full items-start text-left border bg-surface transition-all motion-feedback active:scale-[0.99]", resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, CONTROL_GAP), isChecked
                ? "border-primary-500 bg-primary-500/5 ring-1 ring-primary-500/20 dark:bg-primary-500/10"
                : "border-border hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2", isEffectiveDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", baseSize === "sm" || baseSize === "xs" || baseSize === "xxs" ? "p-3" : "p-4", className) }, props, { children: [_jsx("span", { className: "mt-0.5", children: circle }), _jsxs("div", { className: "flex-1 min-w-0", children: [label ? (_jsx("span", { id: labelId, className: cn("block font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: label })) : null, description ? (_jsx("span", { id: descriptionId, className: "mt-0.5 block text-xs text-muted-foreground", children: description })) : null] })] })));
    }
    return (_jsxs("button", Object.assign({ ref: ref, id: radioId, type: "button", role: "radio", "aria-checked": isChecked, "aria-disabled": isEffectiveDisabled || undefined, "aria-labelledby": label ? labelId : undefined, "aria-describedby": descriptionId, tabIndex: isChecked ? 0 : -1, disabled: isEffectiveDisabled, onClick: handleClick, className: cn("focus-ring group inline-flex items-center text-left transition-colors motion-feedback active:scale-[0.97] select-none", resolveResponsive(size, CONTROL_GAP), typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                ? TOUCH_TARGET_CLASS
                : undefined, isEffectiveDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className) }, props, { children: [circle, label || description ? (_jsxs(VStack, { as: "span", spacing: "none", children: [label ? (_jsx("span", { id: labelId, className: cn("font-medium text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400", resolveResponsive(size, TEXT_SIZE)), children: label })) : null, description ? (_jsx("span", { id: descriptionId, className: "text-xs text-muted-foreground", children: description })) : null] })) : null] })));
});
