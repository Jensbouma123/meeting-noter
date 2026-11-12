import { useEffect } from "react";
import type { PasswordFieldProps } from "@/components/ui/PasswordField/types";

export function useConfirmMatchNotify(
  confirmMode: boolean,
  matches: string | undefined,
  currentPassword: string,
  currentConfirm: string,
  onConfirmMatchChange: PasswordFieldProps["onConfirmMatchChange"],
) {
  useEffect(() => {
    if (confirmMode && onConfirmMatchChange) {
      const isMatched =
        currentPassword.length > 0 && currentPassword === currentConfirm;
      onConfirmMatchChange(isMatched);
    } else if (matches !== undefined && onConfirmMatchChange) {
      const isMatched =
        currentPassword.length > 0 && currentPassword === matches;
      onConfirmMatchChange(isMatched);
    }
  }, [confirmMode, matches, currentPassword, currentConfirm, onConfirmMatchChange]);
}
