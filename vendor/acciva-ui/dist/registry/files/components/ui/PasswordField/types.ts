import type { ChangeEvent } from "react";
import type { InputProps } from "@/components/ui/Input/index";

export type PasswordFieldMode = "login" | "signup" | "reset";

export interface PasswordStrength {
  score: number; // 0 to 4
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
