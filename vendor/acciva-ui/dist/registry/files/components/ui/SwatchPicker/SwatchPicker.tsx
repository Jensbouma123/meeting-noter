"use client";

import { forwardRef, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { resolveOptions } from "@/components/ui/SwatchPicker/options";
import { SwatchOptionButton } from "@/components/ui/SwatchPicker/SwatchPickerParts";
import type { SwatchPickerProps } from "@/components/ui/SwatchPicker/types";
import { useSwatchKeyboard } from "@/components/ui/SwatchPicker/useSwatchKeyboard";
import { useSwatchSelection } from "@/components/ui/SwatchPicker/useSwatchSelection";

export const SwatchPicker = forwardRef<HTMLDivElement, SwatchPickerProps>(function SwatchPicker(
  {
    options,
    value,
    defaultValue = null,
    onChange,
    label,
    hint,
    error,
    required = false,
    disabled = false,
    name,
    orientation = "horizontal",
    size = "md",
    className,
    onKeyDown,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const hintId = hint && !error ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedByIds = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  const resolved = resolveOptions(options);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [current, activeIndex, select, setFocusIndex] = useSwatchSelection(
    resolved,
    value,
    defaultValue,
    onChange,
    disabled,
  );
  const handleKeyDown = useSwatchKeyboard(
    resolved.length,
    activeIndex,
    disabled,
    optionRefs,
    select,
    onKeyDown,
  );

  return (
    <VStack spacing="sm" className={cn("w-full", className)}>
      {label ? (
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </span>
      ) : null}

      <div
        {...rest}
        ref={ref}
        role="radiogroup"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : ariaLabelledBy}
        aria-describedby={describedByIds}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex",
          orientation === "horizontal" ? "flex-row flex-wrap gap-3" : "flex-col gap-3",
        )}
      >
        {resolved.map((option, index) => (
          <SwatchOptionButton
            key={option.key}
            option={option}
            selected={option.hex === current}
            tabbable={index === activeIndex}
            disabled={disabled}
            size={size}
            buttonRef={(node) => {
              optionRefs.current[index] = node;
            }}
            onSelect={() => select(index)}
            onFocus={() => setFocusIndex(index)}
          />
        ))}
      </div>

      {name && current ? <input type="hidden" name={name} value={current} /> : null}

      {error ? (
        <p role="alert" id={errorId} className="text-xs font-medium text-danger animate-fade-in">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </VStack>
  );
});
