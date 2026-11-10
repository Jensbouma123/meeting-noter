/** Returns `[handleChange, handleBlur, handleClear]`. */
export function useInputHandlers(inputRef, isControlled, setUncontrolledValue, runValidation, disabled, readOnly, onChange, onBlur, onClear) {
    const handleChange = (event) => {
        if (!isControlled) {
            setUncontrolledValue(event.target.value);
        }
        runValidation(event.target.value);
        onChange?.(event);
    };
    const handleBlur = (event) => {
        runValidation(event.target.value);
        onBlur?.(event);
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
            onChange?.(syntheticEvent);
            inputRef.current.focus();
        }
        runValidation("");
        onClear?.();
    };
    return [handleChange, handleBlur, handleClear];
}
