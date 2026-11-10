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
import { forwardRef, useEffect, useRef, useState, } from "react";
import { ArrowBigUp } from "lucide-react";
import { Input } from "../../components/ui/Input.js";
import { cn } from "../../lib/utils.js";
import { HStack } from "./HStack.js";
import { VStack } from "./VStack.js";
const STRENGTH_LABELS = {
    0: "Very weak",
    1: "Weak",
    2: "Fair",
    3: "Strong",
    4: "Very strong",
};
const STRENGTH_COLORS = {
    1: "bg-danger",
    2: "bg-warning",
    3: "bg-info",
    4: "bg-success",
};
export function calculatePasswordStrength(password) {
    if (!password || password.length === 0) {
        return { score: 0, label: "Very weak" };
    }
    let points = 0;
    if (password.length >= 8)
        points += 1;
    if (password.length >= 12)
        points += 1;
    if (password.length >= 16)
        points += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password))
        points += 1;
    if (/\d/.test(password))
        points += 1;
    if (/[^a-zA-Z0-9]/.test(password))
        points += 1;
    // Penalize trivial passwords
    if (password.length < 8) {
        points = Math.min(points, 1);
    }
    if (/^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) {
        points = Math.max(0, points - 1);
    }
    if (/^(.)\1+$/.test(password) || /^(123456|password|qwerty|admin)/i.test(password)) {
        points = Math.min(points, 1);
    }
    let score = 0;
    if (points <= 1)
        score = 0;
    else if (points === 2)
        score = 1;
    else if (points === 3 || points === 4)
        score = 2;
    else if (points === 5)
        score = 3;
    else
        score = 4;
    return {
        score,
        label: STRENGTH_LABELS[score],
    };
}
export const PasswordField = forwardRef(function PasswordField(_a, ref) {
    var { mode = "login", autoComplete, showCapsLockWarning = true, showStrengthMeter = false, onStrengthChange, confirmMode = false, confirmLabel = "Confirm password", confirmHint, confirmError, confirmValue, defaultConfirmValue, matchErrorMessage = "Passwords do not match", onConfirmChange, onConfirmMatchChange, matches, error, value, defaultValue, onChange, onKeyDown, onKeyUp, onBlur, className, size = "md", revealToggle = true } = _a, props = __rest(_a, ["mode", "autoComplete", "showCapsLockWarning", "showStrengthMeter", "onStrengthChange", "confirmMode", "confirmLabel", "confirmHint", "confirmError", "confirmValue", "defaultConfirmValue", "matchErrorMessage", "onConfirmChange", "onConfirmMatchChange", "matches", "error", "value", "defaultValue", "onChange", "onKeyDown", "onKeyUp", "onBlur", "className", "size", "revealToggle"]);
    const [capsLockActive, setCapsLockActive] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue !== undefined ? String(defaultValue) : "");
    const [internalConfirmValue, setInternalConfirmValue] = useState(defaultConfirmValue !== undefined ? String(defaultConfirmValue) : "");
    const [confirmTouched, setConfirmTouched] = useState(false);
    const isControlled = value !== undefined;
    const currentPassword = isControlled ? String(value !== null && value !== void 0 ? value : "") : internalValue;
    const isConfirmControlled = confirmValue !== undefined;
    const currentConfirm = isConfirmControlled
        ? String(confirmValue !== null && confirmValue !== void 0 ? confirmValue : "")
        : internalConfirmValue;
    const resolvedAutoComplete = autoComplete !== null && autoComplete !== void 0 ? autoComplete : (mode === "signup" || mode === "reset"
        ? "new-password"
        : "current-password");
    const strength = calculatePasswordStrength(currentPassword);
    const prevStrengthScoreRef = useRef(strength.score);
    useEffect(() => {
        if (showStrengthMeter && onStrengthChange && prevStrengthScoreRef.current !== strength.score) {
            prevStrengthScoreRef.current = strength.score;
            onStrengthChange(strength);
        }
    }, [strength, showStrengthMeter, onStrengthChange]);
    const handleModifierState = (e) => {
        var _a, _b;
        const isCaps = (typeof e.getModifierState === "function" && e.getModifierState("CapsLock")) ||
            (typeof ((_a = e.nativeEvent) === null || _a === void 0 ? void 0 : _a.getModifierState) === "function" &&
                e.nativeEvent.getModifierState("CapsLock")) ||
            Boolean((_b = e.nativeEvent) === null || _b === void 0 ? void 0 : _b.modifierCapsLock);
        setCapsLockActive(Boolean(isCaps));
    };
    const handleKeyDown = (e) => {
        handleModifierState(e);
        onKeyDown === null || onKeyDown === void 0 ? void 0 : onKeyDown(e);
    };
    const handleKeyUp = (e) => {
        handleModifierState(e);
        onKeyUp === null || onKeyUp === void 0 ? void 0 : onKeyUp(e);
    };
    const handleBlur = (e) => {
        setCapsLockActive(false);
        onBlur === null || onBlur === void 0 ? void 0 : onBlur(e);
    };
    const handleChange = (e) => {
        if (!isControlled) {
            setInternalValue(e.target.value);
        }
        onChange === null || onChange === void 0 ? void 0 : onChange(e);
    };
    const handleConfirmChange = (e) => {
        setConfirmTouched(true);
        if (!isConfirmControlled) {
            setInternalConfirmValue(e.target.value);
        }
        onConfirmChange === null || onConfirmChange === void 0 ? void 0 : onConfirmChange(e);
    };
    const standaloneMismatch = matches !== undefined &&
        currentPassword.length > 0 &&
        currentPassword !== matches;
    const integratedMismatch = confirmMode &&
        confirmTouched &&
        currentConfirm.length > 0 &&
        currentPassword !== currentConfirm;
    useEffect(() => {
        if (confirmMode && onConfirmMatchChange) {
            const isMatched = currentPassword.length > 0 && currentPassword === currentConfirm;
            onConfirmMatchChange(isMatched);
        }
        else if (matches !== undefined && onConfirmMatchChange) {
            const isMatched = currentPassword.length > 0 && currentPassword === matches;
            onConfirmMatchChange(isMatched);
        }
    }, [confirmMode, matches, currentPassword, currentConfirm, onConfirmMatchChange]);
    const resolvedError = error !== null && error !== void 0 ? error : (standaloneMismatch ? matchErrorMessage : undefined);
    const resolvedConfirmError = confirmError !== null && confirmError !== void 0 ? confirmError : (integratedMismatch ? matchErrorMessage : undefined);
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [_jsx(Input, Object.assign({ ref: ref, type: "password", size: size, value: value, defaultValue: defaultValue, autoComplete: resolvedAutoComplete, error: resolvedError, revealToggle: revealToggle, onChange: handleChange, onKeyDown: handleKeyDown, onKeyUp: handleKeyUp, onBlur: handleBlur }, props)), showCapsLockWarning && capsLockActive && (_jsxs("div", { role: "status", "aria-live": "polite", className: "flex items-center gap-1.5 text-xs font-medium text-warning animate-fade-in", children: [_jsx(ArrowBigUp, { className: "size-3.5 shrink-0", "aria-hidden": "true" }), _jsx("span", { children: "Caps Lock is on" })] })), showStrengthMeter && currentPassword.length > 0 && (_jsxs(VStack, { spacing: "xs", className: "mt-0.5", children: [_jsx("div", { role: "meter", "aria-valuenow": strength.score, "aria-valuemin": 0, "aria-valuemax": 4, "aria-valuetext": `Password strength: ${strength.label}`, "aria-label": "Password strength", className: "flex gap-2 h-1.5 w-full", children: [1, 2, 3, 4].map((step) => (_jsx("div", { className: cn("h-full flex-1 rounded-full transition-colors motion-feedback", step <= strength.score
                                ? STRENGTH_COLORS[strength.score]
                                : "bg-muted-foreground/20") }, step))) }), _jsxs(HStack, { align: "stretch", justify: "between", spacing: "none", className: "text-xs text-muted-foreground", children: [_jsx("span", { children: "Strength" }), _jsx("span", { className: "font-medium text-foreground", children: strength.label })] })] })), confirmMode && (_jsx(Input, { type: "password", label: confirmLabel, hint: confirmHint, error: resolvedConfirmError, size: size, revealToggle: revealToggle, value: confirmValue, defaultValue: defaultConfirmValue, autoComplete: resolvedAutoComplete, onChange: handleConfirmChange, disabled: props.disabled, readOnly: props.readOnly }))] }));
});
