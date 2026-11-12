"use client";

import { forwardRef, useId, useRef, type HTMLAttributes, type ReactNode } from "react";
import { TEXT_SIZE, resolveResponsive, type ResponsiveSize, type SizeTier } from "@/lib/sizing-tokens/index";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { cn } from "@/lib/utils";
import { ArrowHint } from "@/lib/ArrowHint";
import { VStack } from "@/components/ui/VStack";
import { RadioGroupContext } from "@/components/ui/RadioGroup/context";
import { useRovingFocus } from "@/components/ui/RadioGroup/useRovingFocus";

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string | null;
  onChange: (value: string) => void;
  name?: string;
  label?: string;
  hint?: string;
  error?: string;
  orientation?: "vertical" | "horizontal";
  size?: ResponsiveSize<SizeTier>;
  disabled?: boolean;
  required?: boolean;
  children: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** First-keyboard-focus caption; `false` disables it. */
  arrowHint?: string | false;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    value,
    onChange,
    name,
    label,
    hint,
    error,
    orientation = "vertical",
    size = "md",
    disabled = false,
    required = false,
    className,
    children,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    arrowHint,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const groupName = name ?? `${generatedId}-radio-group`;
  const labelId = `${generatedId}-label`;
  const hintId = hint && !error ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const groupRef = useRef<HTMLDivElement>(null);

  const arrowHintState = useArrowHint("radio-group", arrowHint, "Use arrow keys to move between options");
  const describedByIds = arrowHintState.describedBy([ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined);
  const handleKeyDown = useRovingFocus(groupRef);

  return (
    <RadioGroupContext.Provider
      value={{
        name: groupName,
        value,
        onChange,
        size,
        disabled,
        orientation,
      }}
    >
      <VStack
        ref={(element) => {
          const node = element as HTMLDivElement | null;
          (groupRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="radiogroup"
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : ariaLabelledBy}
        aria-describedby={describedByIds}
        aria-required={required || undefined}
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        {...arrowHintState.groupProps}
        spacing="sm"
        className={cn("relative", className)}
        {...props}
      >
        {label ? (
          <span id={labelId} className={cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}>
            {label}
            {required ? <span className="ml-0.5 text-danger">*</span> : null}
          </span>
        ) : null}

        <div
          className={cn(
            "flex",
            orientation === "horizontal" ? "flex-row flex-wrap gap-4" : "flex-col gap-2.5",
          )}
        >
          {children}
        </div>

        <ArrowHint id={arrowHintState.id} text={arrowHintState.text} visible={arrowHintState.visible} />

        {hint && !error ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger animate-fade-in">
            {error}
          </p>
        ) : null}
      </VStack>
    </RadioGroupContext.Provider>
  );
});
