"use client";

import { forwardRef, useCallback, useId, type HTMLAttributes, type ReactNode } from "react";
import {
  CONTROL_GAP,
  CONTROL_RADIUS,
  TEXT_SIZE,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { useRadioGroupContext } from "@/components/ui/RadioGroup/context";
import { RadioCircle } from "@/components/ui/RadioGroup/RadioGroupParts";

export type RadioVariant = "default" | "card";

export interface RadioProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onChange"> {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /**
   * `"card"` swaps the bare circle-and-label row for a full-width bordered tile.
   * That changes the DOM shape and the hit area, which is a variant, not a flag.
   */
  variant?: RadioVariant;
  /**
   * @deprecated Use `variant="card"`. Kept working so no caller breaks; it loses
   * to `variant` when both are set and will be removed in a future major.
   */
  card?: boolean;
  id?: string;
}

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  { value, label, description, disabled = false, variant, card = false, id, className, ...props },
  ref,
) {
  const resolvedVariant: RadioVariant = variant ?? (card ? "card" : "default");
  const generatedId = useId();
  const radioId = id ?? generatedId;
  const labelId = `${radioId}-label`;
  const descriptionId = description ? `${radioId}-desc` : undefined;

  const { value: groupValue, onChange, size, disabled: groupDisabled } = useRadioGroupContext("Radio");
  const isChecked = groupValue === value;
  const isEffectiveDisabled = groupDisabled || disabled;
  const baseSize = typeof size === "string" ? size : size.base;

  const handleClick = useCallback(() => {
    if (isEffectiveDisabled) return;
    onChange(value);
  }, [isEffectiveDisabled, onChange, value]);

  if (resolvedVariant === "card") {
    return (
      <button
        ref={ref}
        id={radioId}
        type="button"
        role="radio"
        aria-checked={isChecked}
        aria-disabled={isEffectiveDisabled || undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={descriptionId}
        tabIndex={isChecked ? 0 : -1}
        disabled={isEffectiveDisabled}
        onClick={handleClick}
        className={cn(
          "focus-ring relative flex w-full items-start text-left border bg-surface transition-all motion-feedback active:scale-99",
          resolveResponsive(size, CONTROL_RADIUS),
          resolveResponsive(size, CONTROL_GAP),
          isChecked
            ? "border-primary-500 bg-primary-500/5 ring-1 ring-primary-500/20 dark:bg-primary-500/10"
            : "border-border hover:border-muted-foreground/60 active:border-muted-foreground active:bg-elevation-2",
          isEffectiveDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          baseSize === "sm" || baseSize === "xs" || baseSize === "xxs" ? "p-3" : "p-4",
          className,
        )}
        {...props}
      >
        <span className="mt-0.5">
          <RadioCircle size={size} isChecked={isChecked} isDisabled={isEffectiveDisabled} />
        </span>
        <div className="flex-1 min-w-0">
          {label ? (
            <span id={labelId} className={cn("block font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}>
              {label}
            </span>
          ) : null}
          {description ? (
            <span id={descriptionId} className="mt-0.5 block text-xs text-muted-foreground">
              {description}
            </span>
          ) : null}
        </div>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      id={radioId}
      type="button"
      role="radio"
      aria-checked={isChecked}
      aria-disabled={isEffectiveDisabled || undefined}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={descriptionId}
      tabIndex={isChecked ? 0 : -1}
      disabled={isEffectiveDisabled}
      onClick={handleClick}
      className={cn(
        "focus-ring group inline-flex items-center text-left transition-colors motion-feedback active:scale-97 select-none",
        resolveResponsive(size, CONTROL_GAP),
        typeof size === "string"
          ? touchTargetClass(size)
          : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
            ? TOUCH_TARGET_CLASS
            : undefined,
        isEffectiveDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
      {...props}
    >
      <RadioCircle size={size} isChecked={isChecked} isDisabled={isEffectiveDisabled} />
      {label || description ? (
        <VStack as="span" spacing="none">
          {label ? (
            <span
              id={labelId}
              className={cn("font-medium text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400", resolveResponsive(size, TEXT_SIZE))}
            >
              {label}
            </span>
          ) : null}
          {description ? (
            <span id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </span>
          ) : null}
        </VStack>
      ) : null}
    </button>
  );
});
