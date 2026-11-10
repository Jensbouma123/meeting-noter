import { useCallback, useEffect, useState } from "react";
/** Returns `[isControlled, currentValue, setUncontrolledValue, internalError, runValidation]`. */
export function useInputValue(value, defaultValue, validate, minLength, type, min, max, step) {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue !== undefined ? String(defaultValue) : "");
    const [internalError, setInternalError] = useState(undefined);
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
            // A controlled value arrives from the parent, so its validation message has to follow it here.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            runValidation(currentValue);
        }
    }, [isControlled, currentValue, validate, runValidation]);
    return [isControlled, currentValue, setUncontrolledValue, internalError, runValidation];
}
