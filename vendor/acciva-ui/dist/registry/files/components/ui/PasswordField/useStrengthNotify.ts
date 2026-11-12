import { useEffect, useRef } from "react";
import type { PasswordFieldProps, PasswordStrength } from "@/components/ui/PasswordField/types";

export function useStrengthNotify(
  strength: PasswordStrength,
  showStrengthMeter: boolean,
  onStrengthChange: PasswordFieldProps["onStrengthChange"],
) {
  const prevStrengthScoreRef = useRef(strength.score);

  useEffect(() => {
    if (showStrengthMeter && onStrengthChange && prevStrengthScoreRef.current !== strength.score) {
      prevStrengthScoreRef.current = strength.score;
      onStrengthChange(strength);
    }
  }, [strength, showStrengthMeter, onStrengthChange]);
}
