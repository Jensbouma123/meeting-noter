export function useOtpInputEvents(inputRef, sanitize, updateValue, setCaretIndex, locked) {
    const handleHiddenInputChange = (e) => {
        updateValue(e.target.value);
        if (inputRef.current) {
            setCaretIndex(inputRef.current.selectionStart);
        }
    };
    const handlePaste = (e) => {
        e.preventDefault();
        if (locked)
            return;
        const pasted = e.clipboardData?.getData("text") ?? "";
        const sanitized = sanitize(pasted);
        if (sanitized.length > 0) {
            updateValue(sanitized);
            if (inputRef.current) {
                inputRef.current.value = sanitized;
                const pos = sanitized.length;
                inputRef.current.setSelectionRange(pos, pos);
                setCaretIndex(pos);
            }
        }
    };
    return { handleHiddenInputChange, handlePaste };
}
