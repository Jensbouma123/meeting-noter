import type { ChangeEvent } from "react";
import type { InputProps } from "../Input/index.js";
export type PasswordFieldMode = "login" | "signup" | "reset";
export interface PasswordStrength {
    score: number;
    label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
}
export interface PasswordFieldProps extends Omit<InputProps, "type"> {
    mode?: PasswordFieldMode;
    showCapsLockWarning?: boolean;
    showStrengthMeter?: boolean;
    onStrengthChange?: (strength: PasswordStrength) => void;
    confirmMode?: boolean;
    confirmLabel?: string;
    confirmHint?: string;
    confirmError?: string;
    confirmValue?: string;
    defaultConfirmValue?: string;
    matchErrorMessage?: string;
    onConfirmChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    onConfirmMatchChange?: (matches: boolean) => void;
    matches?: string;
}
