import { useState, type RefObject } from "react";

export function useOtpInputCaret(
  inputRef: RefObject<HTMLInputElement | null>,
  currentValue: string,
  length: number,
  locked: boolean,
) {
  const [isFocused, setIsFocused] = useState(false);
  const [caretIndex, setCaretIndex] = useState<number | null>(null);

  const handleFocus = () => {
    setIsFocused(true);
    if (inputRef.current) {
      setCaretIndex(inputRef.current.selectionStart);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setCaretIndex(null);
  };

  const handleKeyDown = () => {
    setTimeout(() => {
      if (inputRef.current) {
        setCaretIndex(inputRef.current.selectionStart);
      }
    }, 0);
  };

  const handleClick = () => {
    if (inputRef.current) {
      setCaretIndex(inputRef.current.selectionStart);
    }
  };

  const handleBoxClick = (index: number) => {
    if (locked) return;
    if (inputRef.current) {
      inputRef.current.focus();
      const pos = Math.min(index, currentValue.length);
      inputRef.current.setSelectionRange(pos, pos);
      setCaretIndex(pos);
    }
  };

  const activeIndex = isFocused
    ? caretIndex !== null && caretIndex < length
      ? caretIndex
      : Math.min(currentValue.length, length - 1)
    : -1;

  return {
    isFocused,
    activeIndex,
    setCaretIndex,
    handleFocus,
    handleBlur,
    handleKeyDown,
    handleClick,
    handleBoxClick,
  };
}
