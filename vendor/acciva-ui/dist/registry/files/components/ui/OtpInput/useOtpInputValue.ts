import { useState } from "react";
import type { OtpInputType } from "@/components/ui/OtpInput/OtpInputTypes";

export function useOtpInputValue(
  length: number,
  type: OtpInputType,
  value: string | undefined,
  defaultValue: string | undefined,
  onChange: ((value: string) => void) | undefined,
  onComplete: ((value: string) => void) | undefined,
) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(
    defaultValue !== undefined ? String(defaultValue).slice(0, length) : "",
  );

  const currentValue = isControlled
    ? String(value ?? "").slice(0, length)
    : uncontrolledValue;

  const sanitize = (str: string): string => {
    return (
      type === "numeric"
        ? str.replace(/\D/g, "")
        : str.replace(/[^0-9a-zA-Z]/g, "")
    ).slice(0, length);
  };

  const updateValue = (next: string) => {
    const sanitized = sanitize(next);
    if (!isControlled) {
      setUncontrolledValue(sanitized);
    }
    onChange?.(sanitized);

    if (sanitized.length === length) {
      onComplete?.(sanitized);
    }
  };

  return { currentValue, sanitize, updateValue };
}
