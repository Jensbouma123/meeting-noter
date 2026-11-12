import type { ChangeEvent, Dispatch, FocusEvent, RefObject, SetStateAction } from "react";
import type { InputProps } from "@/components/ui/Input/types";

/** Returns `[handleChange, handleBlur, handleClear]`. */
export function useInputHandlers(
  inputRef: RefObject<HTMLInputElement | null>,
  isControlled: boolean,
  setUncontrolledValue: Dispatch<SetStateAction<string>>,
  runValidation: (val: string) => string | undefined,
  disabled: boolean | undefined,
  readOnly: boolean | undefined,
  onChange: InputProps["onChange"],
  onBlur: InputProps["onBlur"],
  onClear: InputProps["onClear"],
) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setUncontrolledValue(event.target.value);
    }
    runValidation(event.target.value);
    onChange?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    runValidation(event.target.value);
    onBlur?.(event);
  };

  const handleClear = () => {
    if (disabled || readOnly) return;
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
      } as unknown as ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
      inputRef.current.focus();
    }
    runValidation("");
    onClear?.();
  };

  return [handleChange, handleBlur, handleClear] as const;
}
