import { useState } from "react";
export function useOtpInputValue(length, type, value, defaultValue, onChange, onComplete) {
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue !== undefined ? String(defaultValue).slice(0, length) : "");
    const currentValue = isControlled
        ? String(value ?? "").slice(0, length)
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
        onChange?.(sanitized);
        if (sanitized.length === length) {
            onComplete?.(sanitized);
        }
    };
    return { currentValue, sanitize, updateValue };
}
