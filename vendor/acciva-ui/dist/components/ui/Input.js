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
import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useImperativeHandle, useRef, useState, } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { CONTROL_HEIGHT, CONTROL_RADIUS, ICON_SCALE_CLASS, INPUT_ICON_INSET, INPUT_ICON_INSET_TRAILING, INPUT_ICON_PADDING_LEADING, INPUT_ICON_PADDING_TRAILING, INPUT_PADDING_X, TEXT_SIZE, TOUCH_TARGET_CLASS, TRIPLE_TRAILING_PADDING, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
const DEFAULT_AUTOCOMPLETE = {
    email: "email",
    tel: "tel",
    url: "url",
    password: "current-password",
};
function defaultInputMode(type, step) {
    switch (type) {
        case "email":
            return "email";
        case "tel":
            return "tel";
        case "url":
            return "url";
        case "search":
            return "search";
        case "number": {
            if (step === "any")
                return "decimal";
            if (typeof step === "string" && step.includes("."))
                return "decimal";
            if (typeof step === "number" && !Number.isInteger(step))
                return "decimal";
            return "numeric";
        }
        default:
            return undefined;
    }
}
const DOUBLE_TRAILING_PADDING = {
    xxs: "pr-11",
    xs: "pr-12",
    sm: "pr-14",
    md: "pr-16",
    lg: "pr-18",
    xl: "pr-20",
    "2xl": "pr-22",
    "3xl": "pr-24",
};
// Addons sit flush against the field, so they take the field's own corner radius on their
// outer edge and square off on the edge they share with it.
const ADDON_RADIUS_LEADING = {
    xxs: "rounded-l-md",
    xs: "rounded-l-md",
    sm: "rounded-l-lg",
    md: "rounded-l-lg",
    lg: "rounded-l-lg",
    xl: "rounded-l-xl",
    "2xl": "rounded-l-xl",
    "3xl": "rounded-l-2xl",
};
const ADDON_RADIUS_TRAILING = {
    xxs: "rounded-r-md",
    xs: "rounded-r-md",
    sm: "rounded-r-lg",
    md: "rounded-r-lg",
    lg: "rounded-r-lg",
    xl: "rounded-r-xl",
    "2xl": "rounded-r-xl",
    "3xl": "rounded-r-2xl",
};
const ADDON_JOIN_CLASSES = {
    none: "",
    leading: "rounded-l-none",
    trailing: "rounded-r-none",
    both: "rounded-none",
};
const CLEAR_BUTTON_SIZE = {
    xxs: "size-4",
    xs: "size-5",
    sm: "size-6",
    md: "size-7",
    lg: "size-8",
    xl: "size-9",
    "2xl": "size-10",
    "3xl": "size-11",
};
export const Input = forwardRef(function Input(_a, forwardedRef) {
    var { className, label, hint, error, leadingIcon, trailingIcon, leadingAddon, trailingAddon, size = "md", id, required, disabled, readOnly, clearable = false, onClear, showCharCount = false, validate, value, defaultValue, onChange, onBlur, maxLength, minLength, min, max, step, type = "text", inputMode, autoComplete, revealToggle = true, "aria-describedby": describedBy } = _a, props = __rest(_a, ["className", "label", "hint", "error", "leadingIcon", "trailingIcon", "leadingAddon", "trailingAddon", "size", "id", "required", "disabled", "readOnly", "clearable", "onClear", "showCharCount", "validate", "value", "defaultValue", "onChange", "onBlur", "maxLength", "minLength", "min", "max", "step", "type", "inputMode", "autoComplete", "revealToggle", "aria-describedby"]);
    const generatedId = useId();
    const inputId = id !== null && id !== void 0 ? id : generatedId;
    const inputRef = useRef(null);
    const pendingSelectionRef = useRef(null);
    useImperativeHandle(forwardedRef, () => inputRef.current);
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue !== undefined ? String(defaultValue) : "");
    const [internalError, setInternalError] = useState(undefined);
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === "password";
    const showPasswordToggle = isPassword && revealToggle;
    const effectiveType = isPassword && revealed ? "text" : type;
    const isControlled = value !== undefined;
    const currentValue = isControlled ? (value !== null ? String(value) : "") : uncontrolledValue;
    const runValidation = useCallback((val) => {
        if (validate) {
            const res = validate(val);
            setInternalError(res);
            return res;
        }
        if (val.length > 0) {
            if (minLength !== undefined && val.length < minLength) {
                const res = `Must be at least ${minLength} characters`;
                setInternalError(res);
                return res;
            }
            if (type === "number" && val !== "") {
                const num = Number(val);
                if (min !== undefined && num < Number(min)) {
                    const res = `Must be greater than or equal to ${min}`;
                    setInternalError(res);
                    return res;
                }
                if (max !== undefined && num > Number(max)) {
                    const res = `Must be less than or equal to ${max}`;
                    setInternalError(res);
                    return res;
                }
                if (step !== undefined && step !== "any") {
                    const stepNum = Number(step);
                    const base = min !== undefined ? Number(min) : 0;
                    const offset = (num - base) / stepNum;
                    if (stepNum > 0 && Math.abs(offset - Math.round(offset)) > 1e-9) {
                        const res = `Must be a multiple of ${step}`;
                        setInternalError(res);
                        return res;
                    }
                }
            }
        }
        setInternalError(undefined);
        return undefined;
    }, [validate, minLength, type, min, max, step]);
    useEffect(() => {
        if (isControlled && validate) {
            runValidation(currentValue);
        }
    }, [isControlled, currentValue, validate, runValidation]);
    const handleChange = (event) => {
        if (!isControlled) {
            setUncontrolledValue(event.target.value);
        }
        runValidation(event.target.value);
        onChange === null || onChange === void 0 ? void 0 : onChange(event);
    };
    const handleBlur = (event) => {
        runValidation(event.target.value);
        onBlur === null || onBlur === void 0 ? void 0 : onBlur(event);
    };
    const handleClear = () => {
        if (disabled || readOnly)
            return;
        if (!isControlled) {
            setUncontrolledValue("");
        }
        if (inputRef.current) {
            inputRef.current.value = "";
            const syntheticEvent = {
                target: inputRef.current,
                currentTarget: inputRef.current,
                bubbles: true,
                cancelable: false,
            };
            onChange === null || onChange === void 0 ? void 0 : onChange(syntheticEvent);
            inputRef.current.focus();
        }
        runValidation("");
        onClear === null || onClear === void 0 ? void 0 : onClear();
    };
    const handleToggleReveal = () => {
        var _a, _b;
        const el = inputRef.current;
        if (el) {
            const end = el.value.length;
            pendingSelectionRef.current = {
                start: (_a = el.selectionStart) !== null && _a !== void 0 ? _a : end,
                end: (_b = el.selectionEnd) !== null && _b !== void 0 ? _b : end,
            };
        }
        setRevealed((prev) => !prev);
    };
    useLayoutEffect(() => {
        const el = inputRef.current;
        const pending = pendingSelectionRef.current;
        if (el && pending) {
            el.setSelectionRange(pending.start, pending.end);
            pendingSelectionRef.current = null;
        }
    }, [revealed]);
    const activeError = error !== null && error !== void 0 ? error : internalError;
    const isInvalid = Boolean(activeError);
    const showClear = clearable && !disabled && !readOnly && currentValue.length > 0;
    const resolvedInputMode = inputMode !== null && inputMode !== void 0 ? inputMode : defaultInputMode(type, step);
    const resolvedAutoComplete = autoComplete !== null && autoComplete !== void 0 ? autoComplete : DEFAULT_AUTOCOMPLETE[type];
    const hintId = hint && !activeError ? `${inputId}-hint` : undefined;
    const errorId = activeError ? `${inputId}-error` : undefined;
    const charCountId = showCharCount ? `${inputId}-charcount` : undefined;
    const leadingAddonId = leadingAddon ? `${inputId}-leading-addon` : undefined;
    const trailingAddonId = trailingAddon ? `${inputId}-trailing-addon` : undefined;
    const describedByIds = [describedBy, leadingAddonId, trailingAddonId, hintId, errorId, charCountId].filter(Boolean).join(" ") ||
        undefined;
    const charCount = currentValue.length;
    const isOverMax = maxLength !== undefined && charCount > maxLength;
    const trailingCount = [showClear, showPasswordToggle, Boolean(trailingIcon)].filter(Boolean).length;
    const trailingPaddingClass = trailingCount === 0
        ? resolveResponsive(size, INPUT_PADDING_X)
        : trailingCount === 1
            ? resolveResponsive(size, INPUT_ICON_PADDING_TRAILING)
            : trailingCount === 2
                ? resolveResponsive(size, DOUBLE_TRAILING_PADDING)
                : resolveResponsive(size, TRIPLE_TRAILING_PADDING);
    const addonJoin = leadingAddon && trailingAddon ? "both" : leadingAddon ? "leading" : trailingAddon ? "trailing" : "none";
    const addonClassName = cn("inline-flex shrink-0 items-center whitespace-nowrap border border-border bg-elevation-2 text-muted-foreground", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, INPUT_PADDING_X), resolveResponsive(size, TEXT_SIZE), resolveResponsive(size, ICON_SCALE_CLASS), disabled && "opacity-60");
    return (_jsxs("div", { className: "flex w-full flex-col gap-1.5", children: [label ? (_jsxs("label", { htmlFor: inputId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: [label, required ? _jsx("span", { className: "ml-0.5 text-danger", children: "*" }) : null] })) : null, _jsxs(HStack, { align: "stretch", spacing: "none", className: "w-full", children: [leadingAddon ? (_jsx("span", { id: leadingAddonId, className: cn(addonClassName, resolveResponsive(size, ADDON_RADIUS_LEADING), "-mr-px"), children: leadingAddon })) : null, _jsxs("div", { className: "relative flex min-w-0 flex-1 items-center", children: [leadingIcon ? (_jsx("span", { className: cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", resolveResponsive(size, INPUT_ICON_INSET), resolveResponsive(size, ICON_SCALE_CLASS)), children: leadingIcon })) : null, _jsx("input", Object.assign({ ref: inputRef, id: inputId, type: effectiveType, inputMode: resolvedInputMode, autoComplete: resolvedAutoComplete, required: required, disabled: disabled, readOnly: readOnly, value: value, defaultValue: defaultValue, onChange: handleChange, onBlur: handleBlur, maxLength: maxLength, minLength: minLength, min: min, max: max, step: step, "aria-invalid": isInvalid ? true : undefined, "aria-describedby": describedByIds, className: cn("focus-ring w-full border bg-background text-foreground placeholder:text-muted-foreground", "transition-colors motion-feedback", disabled && "cursor-not-allowed opacity-60 bg-elevation-2", readOnly && "cursor-default bg-elevation-1", isInvalid ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60", type === "number" &&
                                    "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]", type === "search" &&
                                    "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none", resolveResponsive(size, CONTROL_HEIGHT), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, TEXT_SIZE), leadingIcon ? resolveResponsive(size, INPUT_ICON_PADDING_LEADING) : resolveResponsive(size, INPUT_PADDING_X), trailingPaddingClass, ADDON_JOIN_CLASSES[addonJoin], className) }, props)), (showClear || showPasswordToggle || trailingIcon) ? (_jsxs(HStack, { spacing: "xs", className: cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", resolveResponsive(size, INPUT_ICON_INSET_TRAILING)), children: [showClear ? (_jsx("button", { type: "button", tabIndex: -1, "aria-label": label ? `Clear ${label}` : "Clear input", onClick: handleClear, className: cn("focus-ring flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3", resolveResponsive(size, CLEAR_BUTTON_SIZE), resolveResponsive(size, ICON_SCALE_CLASS)), children: _jsx(X, { className: "shrink-0" }) })) : null, showPasswordToggle ? (_jsx("button", { type: "button", "aria-label": revealed ? "Hide password" : "Show password", "aria-pressed": revealed, onClick: handleToggleReveal, className: cn("focus-ring flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-elevation-2 hover:text-foreground active:scale-95 dark:hover:bg-elevation-3", resolveResponsive(size, CLEAR_BUTTON_SIZE), resolveResponsive(size, ICON_SCALE_CLASS), typeof size === "string"
                                            ? touchTargetClass(size)
                                            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                                                ? TOUCH_TARGET_CLASS
                                                : undefined), children: revealed ? _jsx(EyeOff, { className: "shrink-0" }) : _jsx(Eye, { className: "shrink-0" }) })) : null, trailingIcon ? (_jsx("span", { className: cn("pointer-events-none flex items-center justify-center", resolveResponsive(size, ICON_SCALE_CLASS)), children: trailingIcon })) : null] })) : null] }), trailingAddon ? (_jsx("span", { id: trailingAddonId, className: cn(addonClassName, resolveResponsive(size, ADDON_RADIUS_TRAILING), "-ml-px"), children: trailingAddon })) : null] }), (hint || activeError || showCharCount) ? (_jsxs(HStack, { justify: "between", spacing: "sm", children: [_jsx("div", { className: "min-w-0 flex-1", children: activeError ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: activeError })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null }), showCharCount ? (_jsxs("span", { id: charCountId, "aria-live": "polite", className: cn("shrink-0 text-xs font-mono tabular-nums", isOverMax ? "font-semibold text-danger" : "text-muted-foreground"), children: [charCount, maxLength !== undefined ? ` / ${maxLength}` : ""] })) : null] })) : null] }));
});
