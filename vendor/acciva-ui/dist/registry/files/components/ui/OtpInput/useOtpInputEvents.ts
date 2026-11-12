import type { ChangeEvent, ClipboardEvent, RefObject } from "react";

export function useOtpInputEvents(
  inputRef: RefObject<HTMLInputElement | null>,
  sanitize: (str: string) => string,
  updateValue: (next: string) => void,
  setCaretIndex: (index: number | null) => void,
  locked: boolean,
) {
  const handleHiddenInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateValue(e.target.value);
    if (inputRef.current) {
      setCaretIndex(inputRef.current.selectionStart);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (locked) return;

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
