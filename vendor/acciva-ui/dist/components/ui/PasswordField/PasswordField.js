"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useState } from "react";
import { Input } from "../Input/index.js";
import { cn } from "../../../lib/utils.js";
import { VStack } from "../VStack.js";
import { CapsLockNotice, StrengthMeter } from "./PasswordFieldParts.js";
import { calculatePasswordStrength } from "./passwordStrength.js";
import { useCapsLock } from "./useCapsLock.js";
import { useConfirmMatchNotify } from "./useConfirmMatchNotify.js";
import { useStrengthNotify } from "./useStrengthNotify.js";
export const PasswordField = forwardRef(function PasswordField({ mode = "login", autoComplete, showCapsLockWarning = true, showStrengthMeter = false, onStrengthChange, confirmMode = false, confirmLabel = "Confirm password", confirmHint, confirmError, confirmValue, defaultConfirmValue, matchErrorMessage = "Passwords do not match", onConfirmChange, onConfirmMatchChange, matches, error, value, defaultValue, onChange, onKeyDown, onKeyUp, onBlur, className, size = "md", revealToggle = true, ...props }, ref) {
    const { capsLockActive, handleKeyDown, handleKeyUp, handleBlur } = useCapsLock({ onKeyDown, onKeyUp, onBlur });
    const [internalValue, setInternalValue] = useState(defaultValue !== undefined ? String(defaultValue) : "");
    const [internalConfirmValue, setInternalConfirmValue] = useState(defaultConfirmValue !== undefined ? String(defaultConfirmValue) : "");
    const [confirmTouched, setConfirmTouched] = useState(false);
    const isControlled = value !== undefined;
    const currentPassword = isControlled ? String(value ?? "") : internalValue;
    const isConfirmControlled = confirmValue !== undefined;
    const currentConfirm = isConfirmControlled
        ? String(confirmValue ?? "")
        : internalConfirmValue;
    const resolvedAutoComplete = autoComplete ??
        (mode === "signup" || mode === "reset"
            ? "new-password"
            : "current-password");
    const strength = calculatePasswordStrength(currentPassword);
    useStrengthNotify(strength, showStrengthMeter, onStrengthChange);
    const handleChange = (e) => {
        if (!isControlled) {
            setInternalValue(e.target.value);
        }
        onChange?.(e);
    };
    const handleConfirmChange = (e) => {
        setConfirmTouched(true);
        if (!isConfirmControlled) {
            setInternalConfirmValue(e.target.value);
        }
        onConfirmChange?.(e);
    };
    const standaloneMismatch = matches !== undefined &&
        currentPassword.length > 0 &&
        currentPassword !== matches;
    const integratedMismatch = confirmMode &&
        confirmTouched &&
        currentConfirm.length > 0 &&
        currentPassword !== currentConfirm;
    useConfirmMatchNotify(confirmMode, matches, currentPassword, currentConfirm, onConfirmMatchChange);
    const resolvedError = error ?? (standaloneMismatch ? matchErrorMessage : undefined);
    const resolvedConfirmError = confirmError ?? (integratedMismatch ? matchErrorMessage : undefined);
    return (_jsxs(VStack, { spacing: "sm", className: cn("w-full", className), children: [_jsx(Input, { ref: ref, type: "password", size: size, value: value, defaultValue: defaultValue, autoComplete: resolvedAutoComplete, error: resolvedError, revealToggle: revealToggle, onChange: handleChange, onKeyDown: handleKeyDown, onKeyUp: handleKeyUp, onBlur: handleBlur, ...props }), showCapsLockWarning && capsLockActive && _jsx(CapsLockNotice, {}), showStrengthMeter && currentPassword.length > 0 && (_jsx(StrengthMeter, { score: strength.score, label: strength.label })), confirmMode && (_jsx(Input, { type: "password", label: confirmLabel, hint: confirmHint, error: resolvedConfirmError, size: size, revealToggle: revealToggle, value: confirmValue, defaultValue: defaultConfirmValue, autoComplete: resolvedAutoComplete, onChange: handleConfirmChange, disabled: props.disabled, readOnly: props.readOnly }))] }));
});
