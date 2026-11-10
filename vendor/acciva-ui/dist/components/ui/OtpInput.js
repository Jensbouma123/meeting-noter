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
import { forwardRef, useId, useImperativeHandle, useRef, useState, } from "react";
import { CONTROL_RADIUS, TEXT_SIZE, TOUCH_TARGET_CLASS, needsTouchTarget, resolveResponsive, touchTargetClass, } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
const OTP_BOX_SIZE = {
    xxs: "size-7",
    xs: "size-8",
    sm: "size-9",
    md: "size-11",
    lg: "size-12",
    xl: "size-14",
    "2xl": "size-16",
    "3xl": "size-18",
};
export const OtpInput = forwardRef(function OtpInput(_a, ref) {
    var _b, _c;
    var { length = 6, value, defaultValue, onChange, onComplete, type = "numeric", disabled = false, readOnly = false, autoFocus = false, label, hint, error, size = "md", mask = false, className, "aria-describedby": describedBy } = _a, props = __rest(_a, ["length", "value", "defaultValue", "onChange", "onComplete", "type", "disabled", "readOnly", "autoFocus", "label", "hint", "error", "size", "mask", "className", "aria-describedby"]);
    const generatedId = useId();
    const inputId = (_b = props.id) !== null && _b !== void 0 ? _b : generatedId;
    const labelId = `${inputId}-label`;
    const hiddenInputRef = useRef(null);
    useImperativeHandle(ref, () => hiddenInputRef.current);
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue !== undefined ? String(defaultValue).slice(0, length) : "");
    const [isFocused, setIsFocused] = useState(false);
    const [caretIndex, setCaretIndex] = useState(null);
    const currentValue = isControlled
        ? String(value !== null && value !== void 0 ? value : "").slice(0, length)
        : uncontrolledValue;
    const sanitize = (str) => {
        return (type === "numeric"
            ? str.replace(/\D/g, "")
            : str.replace(/[^0-9a-zA-Z]/g, "")).slice(0, length);
    };
    const updateValue = (next) => {
        const sanitized = sanitize(next);
        if (!isControlled) {
            setUncontrolledValue(sanitized);
        }
        onChange === null || onChange === void 0 ? void 0 : onChange(sanitized);
        if (sanitized.length === length) {
            onComplete === null || onComplete === void 0 ? void 0 : onComplete(sanitized);
        }
    };
    const handleHiddenInputChange = (e) => {
        updateValue(e.target.value);
        if (hiddenInputRef.current) {
            setCaretIndex(hiddenInputRef.current.selectionStart);
        }
    };
    const handlePaste = (e) => {
        var _a, _b;
        e.preventDefault();
        if (disabled || readOnly)
            return;
        const pasted = (_b = (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.getData("text")) !== null && _b !== void 0 ? _b : "";
        const sanitized = sanitize(pasted);
        if (sanitized.length > 0) {
            updateValue(sanitized);
            if (hiddenInputRef.current) {
                hiddenInputRef.current.value = sanitized;
                const pos = sanitized.length;
                hiddenInputRef.current.setSelectionRange(pos, pos);
                setCaretIndex(pos);
            }
        }
    };
    const handleFocus = () => {
        setIsFocused(true);
        if (hiddenInputRef.current) {
            setCaretIndex(hiddenInputRef.current.selectionStart);
        }
    };
    const handleBlur = (e) => {
        setIsFocused(false);
        setCaretIndex(null);
    };
    const handleKeyDown = (e) => {
        setTimeout(() => {
            if (hiddenInputRef.current) {
                setCaretIndex(hiddenInputRef.current.selectionStart);
            }
        }, 0);
    };
    const handleClick = (e) => {
        if (hiddenInputRef.current) {
            setCaretIndex(hiddenInputRef.current.selectionStart);
        }
    };
    const handleBoxClick = (index) => {
        if (disabled || readOnly)
            return;
        if (hiddenInputRef.current) {
            hiddenInputRef.current.focus();
            const pos = Math.min(index, currentValue.length);
            hiddenInputRef.current.setSelectionRange(pos, pos);
            setCaretIndex(pos);
        }
    };
    const isInvalid = Boolean(error);
    const hintId = hint && !isInvalid ? `${inputId}-hint` : undefined;
    const errorId = isInvalid ? `${inputId}-error` : undefined;
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
    const activeIndex = isFocused
        ? caretIndex !== null && caretIndex < length
            ? caretIndex
            : Math.min(currentValue.length, length - 1)
        : -1;
    return (_jsxs("div", Object.assign({ role: "group", "aria-label": (_c = props["aria-label"]) !== null && _c !== void 0 ? _c : (label ? `${label} group` : "Verification code"), className: cn("flex flex-col gap-1.5", className) }, props, { children: [label ? (_jsx("label", { htmlFor: inputId, className: cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE)), children: label })) : null, _jsxs(HStack, { spacing: "sm", className: "relative", children: [_jsx("input", { ref: hiddenInputRef, id: inputId, type: type === "numeric" ? "tel" : "text", inputMode: type === "numeric" ? "numeric" : "text", autoComplete: "one-time-code", maxLength: length, value: currentValue, disabled: disabled, readOnly: readOnly, autoFocus: autoFocus, "aria-label": label ? undefined : "Verification code", "aria-invalid": isInvalid ? true : undefined, "aria-describedby": describedByIds, className: "absolute inset-0 size-full opacity-0 cursor-pointer z-10", tabIndex: 0, onChange: handleHiddenInputChange, onKeyDown: handleKeyDown, onPaste: handlePaste, onFocus: handleFocus, onBlur: handleBlur, onClick: handleClick }), Array.from({ length }, (_, i) => {
                        var _a;
                        const char = (_a = currentValue[i]) !== null && _a !== void 0 ? _a : "";
                        const isBoxFocused = isFocused && activeIndex === i;
                        return (_jsxs("div", { role: "presentation", onClick: () => handleBoxClick(i), className: cn("flex items-center justify-center font-mono font-bold text-center border transition-all motion-feedback select-none cursor-text", resolveResponsive(size, OTP_BOX_SIZE), resolveResponsive(size, CONTROL_RADIUS), resolveResponsive(size, TEXT_SIZE), isBoxFocused
                                ? "border-focus-ring ring-2 ring-focus-ring/30"
                                : isInvalid
                                    ? "border-danger text-danger"
                                    : char
                                        ? "border-foreground/30 text-foreground bg-background"
                                        : "border-border text-muted-foreground bg-background hover:border-muted-foreground/60 active:border-foreground active:bg-elevation-1", disabled && "cursor-not-allowed opacity-60 bg-elevation-2", readOnly && "cursor-default bg-elevation-1", typeof size === "string"
                                ? touchTargetClass(size)
                                : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
                                    ? TOUCH_TARGET_CLASS
                                    : undefined), children: [mask && char ? "•" : char, isBoxFocused && !char && (_jsx("span", { className: "w-0.5 h-4 bg-focus-ring animate-pulse", "aria-hidden": "true" }))] }, i));
                    })] }), hint || error ? (_jsx("div", { className: "min-w-0", children: error ? (_jsx("p", { id: errorId, role: "alert", className: "text-xs font-medium text-danger animate-fade-in", children: error })) : hint ? (_jsx("p", { id: hintId, className: "text-xs text-muted-foreground", children: hint })) : null })) : null] })));
});
