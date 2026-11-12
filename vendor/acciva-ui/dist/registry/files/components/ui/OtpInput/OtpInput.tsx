"use client";

import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import { TEXT_SIZE, resolveResponsive } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import { OtpInputBox, OtpInputMessage } from "@/components/ui/OtpInput/OtpInputParts";
import type { OtpInputProps } from "@/components/ui/OtpInput/OtpInputTypes";
import { useOtpInputCaret } from "@/components/ui/OtpInput/useOtpInputCaret";
import { useOtpInputEvents } from "@/components/ui/OtpInput/useOtpInputEvents";
import { useOtpInputValue } from "@/components/ui/OtpInput/useOtpInputValue";

export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(
  function OtpInput(
    {
      length = 6,
      value,
      defaultValue,
      onChange,
      onComplete,
      type = "numeric",
      disabled = false,
      readOnly = false,
      autoFocus = false,
      label,
      hint,
      error,
      size = "md",
      mask = false,
      className,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    const labelId = `${inputId}-label`;
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const locked = disabled || readOnly;

    useImperativeHandle(ref, () => hiddenInputRef.current as HTMLInputElement);

    const { currentValue, sanitize, updateValue } = useOtpInputValue(
      length,
      type,
      value,
      defaultValue,
      onChange,
      onComplete,
    );
    const {
      isFocused,
      activeIndex,
      setCaretIndex,
      handleFocus,
      handleBlur,
      handleKeyDown,
      handleClick,
      handleBoxClick,
    } = useOtpInputCaret(hiddenInputRef, currentValue, length, locked);

    const { handleHiddenInputChange, handlePaste } = useOtpInputEvents(
      hiddenInputRef,
      sanitize,
      updateValue,
      setCaretIndex,
      locked,
    );

    const isInvalid = Boolean(error);
    const hintId = hint && !isInvalid ? `${inputId}-hint` : undefined;
    const errorId = isInvalid ? `${inputId}-error` : undefined;
    const describedByIds =
      [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div
        role="group"
        aria-label={props["aria-label"] ?? (label ? `${label} group` : "Verification code")}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      >
        {label ? (
          <label
            htmlFor={inputId}
            className={cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}
          >
            {label}
          </label>
        ) : null}

        <HStack spacing="sm" className="relative">
          <input
            ref={hiddenInputRef}
            id={inputId}
            type={type === "numeric" ? "tel" : "text"}
            inputMode={type === "numeric" ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={length}
            value={currentValue}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            // Mark for Modal/Drawer initial focus: React's commit-time focus misses a closed dialog.
            data-autofocus={autoFocus || undefined}
            aria-label={label ? undefined : "Verification code"}
            aria-invalid={isInvalid ? true : undefined}
            aria-describedby={describedByIds}
            className="absolute inset-0 size-full opacity-0 cursor-pointer z-10"
            tabIndex={0}
            onChange={handleHiddenInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
          />

          {Array.from({ length }, (_, i) => (
            <OtpInputBox
              key={i}
              char={currentValue[i] ?? ""}
              isBoxFocused={isFocused && activeIndex === i}
              isInvalid={isInvalid}
              mask={mask}
              disabled={disabled}
              readOnly={readOnly}
              size={size}
              onSelect={() => handleBoxClick(i)}
            />
          ))}
        </HStack>

        {hint || error ? (
          <OtpInputMessage
            error={error}
            hint={hint}
            errorId={errorId}
            hintId={hintId}
          />
        ) : null}
      </div>
    );
  },
);
