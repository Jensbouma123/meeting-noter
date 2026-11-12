"use client";

import { forwardRef, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/Input/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { CapsLockNotice, StrengthMeter } from "@/components/ui/PasswordField/PasswordFieldParts";
import { calculatePasswordStrength } from "@/components/ui/PasswordField/passwordStrength";
import type { PasswordFieldProps } from "@/components/ui/PasswordField/types";
import { useCapsLock } from "@/components/ui/PasswordField/useCapsLock";
import { useConfirmMatchNotify } from "@/components/ui/PasswordField/useConfirmMatchNotify";
import { useStrengthNotify } from "@/components/ui/PasswordField/useStrengthNotify";

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    {
      mode = "login",
      autoComplete,
      showCapsLockWarning = true,
      showStrengthMeter = false,
      onStrengthChange,
      confirmMode = false,
      confirmLabel = "Confirm password",
      confirmHint,
      confirmError,
      confirmValue,
      defaultConfirmValue,
      matchErrorMessage = "Passwords do not match",
      onConfirmChange,
      onConfirmMatchChange,
      matches,
      error,
      value,
      defaultValue,
      onChange,
      onKeyDown,
      onKeyUp,
      onBlur,
      className,
      size = "md",
      revealToggle = true,
      ...props
    },
    ref,
  ) {
    const { capsLockActive, handleKeyDown, handleKeyUp, handleBlur } = useCapsLock({ onKeyDown, onKeyUp, onBlur });
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== undefined ? String(defaultValue) : "",
    );
    const [internalConfirmValue, setInternalConfirmValue] = useState<string>(
      defaultConfirmValue !== undefined ? String(defaultConfirmValue) : "",
    );
    const [confirmTouched, setConfirmTouched] = useState(false);

    const isControlled = value !== undefined;
    const currentPassword = isControlled ? String(value ?? "") : internalValue;

    const isConfirmControlled = confirmValue !== undefined;
    const currentConfirm = isConfirmControlled
      ? String(confirmValue ?? "")
      : internalConfirmValue;

    const resolvedAutoComplete =
      autoComplete ??
      (mode === "signup" || mode === "reset"
        ? "new-password"
        : "current-password");

    const strength = calculatePasswordStrength(currentPassword);
    useStrengthNotify(strength, showStrengthMeter, onStrengthChange);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const handleConfirmChange = (e: ChangeEvent<HTMLInputElement>) => {
      setConfirmTouched(true);
      if (!isConfirmControlled) {
        setInternalConfirmValue(e.target.value);
      }
      onConfirmChange?.(e);
    };

    const standaloneMismatch =
      matches !== undefined &&
      currentPassword.length > 0 &&
      currentPassword !== matches;

    const integratedMismatch =
      confirmMode &&
      confirmTouched &&
      currentConfirm.length > 0 &&
      currentPassword !== currentConfirm;

    useConfirmMatchNotify(confirmMode, matches, currentPassword, currentConfirm, onConfirmMatchChange);

    const resolvedError = error ?? (standaloneMismatch ? matchErrorMessage : undefined);
    const resolvedConfirmError =
      confirmError ?? (integratedMismatch ? matchErrorMessage : undefined);

    return (
      <VStack spacing="sm" className={cn("w-full", className)}>
        <Input
          ref={ref}
          type="password"
          size={size}
          value={value}
          defaultValue={defaultValue}
          autoComplete={resolvedAutoComplete}
          error={resolvedError}
          revealToggle={revealToggle}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onBlur={handleBlur}
          {...props}
        />

        {showCapsLockWarning && capsLockActive && <CapsLockNotice />}

        {showStrengthMeter && currentPassword.length > 0 && (
          <StrengthMeter score={strength.score} label={strength.label} />
        )}

        {confirmMode && (
          <Input
            type="password"
            label={confirmLabel}
            hint={confirmHint}
            error={resolvedConfirmError}
            size={size}
            revealToggle={revealToggle}
            value={confirmValue}
            defaultValue={defaultConfirmValue}
            autoComplete={resolvedAutoComplete}
            onChange={handleConfirmChange}
            disabled={props.disabled}
            readOnly={props.readOnly}
          />
        )}
      </VStack>
    );
  },
);
