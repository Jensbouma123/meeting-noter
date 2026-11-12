"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { HStack } from "@/components/ui/HStack";
import { InputActions } from "@/components/ui/Input/InputActions";
import { InputAddon, InputLabel, InputLeadingIcon, InputMessages } from "@/components/ui/Input/InputParts";
import { DEFAULT_AUTOCOMPLETE, defaultInputMode } from "@/components/ui/Input/constants";
import { inputClassName } from "@/components/ui/Input/inputClasses";
import type { InputProps } from "@/components/ui/Input/types";
import { useInputHandlers } from "@/components/ui/Input/useInputHandlers";
import { useInputIds } from "@/components/ui/Input/useInputIds";
import { useInputReveal } from "@/components/ui/Input/useInputReveal";
import { useInputValue } from "@/components/ui/Input/useInputValue";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, forwardedRef) {
  const {
    className,
    label,
    hint,
    error,
    leadingIcon,
    trailingIcon,
    leadingAddon,
    trailingAddon,
    size = "md",
    id,
    required,
    disabled,
    readOnly,
    clearable = false,
    onClear,
    showCharCount = false,
    validate,
    value,
    defaultValue,
    onChange,
    onBlur,
    maxLength,
    minLength,
    min,
    max,
    step,
    type = "text",
    inputMode,
    autoComplete,
    revealToggle = true,
    "aria-describedby": describedBy,
    ...rest
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  const isPassword = type === "password";
  const showPasswordToggle = isPassword && revealToggle;
  const [revealed, handleToggleReveal] = useInputReveal(inputRef);
  const [isControlled, currentValue, setUncontrolledValue, internalError, runValidation] = useInputValue(
    value, defaultValue, validate, minLength, type, min, max, step,
  );
  const [handleChange, handleBlur, handleClear] = useInputHandlers(
    inputRef, isControlled, setUncontrolledValue, runValidation, disabled, readOnly, onChange, onBlur, onClear,
  );
  const activeError = error ?? internalError;
  const showClear = clearable && !disabled && !readOnly && currentValue.length > 0;
  const [inputId, hintId, errorId, charCountId, leadingAddonId, trailingAddonId, describedByIds] = useInputIds(
    id, hint, activeError, showCharCount, leadingAddon, trailingAddon, describedBy,
  );
  const trailingCount = [showClear, showPasswordToggle, Boolean(trailingIcon)].filter(Boolean).length;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? <InputLabel id={inputId} label={label} required={required} size={size} /> : null}

      <HStack align="stretch" spacing="none" className="w-full">
        {leadingAddon ? (
          <InputAddon id={leadingAddonId} side="leading" size={size} disabled={disabled}>
            {leadingAddon}
          </InputAddon>
        ) : null}

        <div className="relative flex min-w-0 flex-1 items-center">
          {leadingIcon ? <InputLeadingIcon size={size}>{leadingIcon}</InputLeadingIcon> : null}

          <input
            ref={inputRef}
            id={inputId}
            type={isPassword && revealed ? "text" : type}
            inputMode={inputMode ?? defaultInputMode(type, step)}
            autoComplete={autoComplete ?? DEFAULT_AUTOCOMPLETE[type]}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={maxLength}
            minLength={minLength}
            min={min}
            max={max}
            step={step}
            aria-invalid={activeError ? true : undefined}
            aria-describedby={describedByIds}
            // React keeps autoFocus out of the DOM and its commit-time focus misses a closed dialog;
            // the mark lets Modal/Drawer initial focus find it (pickInitialFocus, SC 2.4.3).
            data-autofocus={rest.autoFocus || undefined}
            className={inputClassName(
              size, type, disabled, readOnly, Boolean(activeError), Boolean(leadingIcon), trailingCount,
              Boolean(leadingAddon), Boolean(trailingAddon), className,
            )}
            {...rest}
          />

          <InputActions
            size={size}
            label={label}
            showClear={showClear}
            showPasswordToggle={showPasswordToggle}
            trailingIcon={trailingIcon}
            revealed={revealed}
            onClear={handleClear}
            onToggleReveal={handleToggleReveal}
          />
        </div>

        {trailingAddon ? (
          <InputAddon id={trailingAddonId} side="trailing" size={size} disabled={disabled}>
            {trailingAddon}
          </InputAddon>
        ) : null}
      </HStack>

      {hint || activeError || showCharCount ? (
        <InputMessages
          hint={hint}
          error={activeError}
          hintId={hintId}
          errorId={errorId}
          charCountId={showCharCount ? charCountId : undefined}
          count={currentValue.length}
          maxLength={maxLength}
        />
      ) : null}
    </div>
  );
});
