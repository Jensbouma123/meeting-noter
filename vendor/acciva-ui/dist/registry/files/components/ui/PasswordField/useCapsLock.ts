import { useState, type FocusEvent, type KeyboardEvent } from "react";
import type { PasswordFieldProps } from "@/components/ui/PasswordField/types";

type InputEventHandlers = Pick<PasswordFieldProps, "onKeyDown" | "onKeyUp" | "onBlur">;

export function useCapsLock({ onKeyDown, onKeyUp, onBlur }: InputEventHandlers) {
  const [capsLockActive, setCapsLockActive] = useState(false);

  const handleModifierState = (e: KeyboardEvent<HTMLInputElement>) => {
    const isCaps =
      (typeof e.getModifierState === "function" && e.getModifierState("CapsLock")) ||
      (typeof (e.nativeEvent as any)?.getModifierState === "function" &&
        (e.nativeEvent as any).getModifierState("CapsLock")) ||
      Boolean((e.nativeEvent as any)?.modifierCapsLock);

    setCapsLockActive(Boolean(isCaps));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    handleModifierState(e);
    onKeyDown?.(e);
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    handleModifierState(e);
    onKeyUp?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setCapsLockActive(false);
    onBlur?.(e);
  };

  return { capsLockActive, handleKeyDown, handleKeyUp, handleBlur };
}
