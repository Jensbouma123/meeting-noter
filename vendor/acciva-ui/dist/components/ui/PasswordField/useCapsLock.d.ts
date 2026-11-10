import { type FocusEvent, type KeyboardEvent } from "react";
import type { PasswordFieldProps } from "./types.js";
type InputEventHandlers = Pick<PasswordFieldProps, "onKeyDown" | "onKeyUp" | "onBlur">;
export declare function useCapsLock({ onKeyDown, onKeyUp, onBlur }: InputEventHandlers): {
    capsLockActive: boolean;
    handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    handleKeyUp: (e: KeyboardEvent<HTMLInputElement>) => void;
    handleBlur: (e: FocusEvent<HTMLInputElement>) => void;
};
export {};
