"use client";

import { useId, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import {
  SWITCH_THUMB,
  SWITCH_THUMB_TRANSLATE,
  SWITCH_TRACK,
  TEXT_SIZE,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
  size?: ResponsiveSize<SizeTier>;
  /** Merged onto the root wrapper that holds the track and the label. */
  className?: string;
  "aria-label"?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  id,
  size = "md",
  className,
  "aria-label": ariaLabel,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const labelId = `${switchId}-label`;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (disabled) return;
    onCheckedChange(!checked);
  };

  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-2.5 text-foreground",
        resolveResponsive(size, TEXT_SIZE),
        disabled && "opacity-60",
        className,
      )}
      {...props}
    >
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          "focus-ring relative inline-flex min-h-6 shrink-0 cursor-pointer items-center rounded-full disabled:cursor-not-allowed",
          typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
              ? TOUCH_TARGET_CLASS
              : undefined,
        )}
      >
        {/*
          The button is the pointer target and never falls under the SC 2.5.8 24px
          floor; the track below keeps the tier's designed height (14px at `xxs`).
          Every pointer input gets the floor, not just coarse ones - `touch-target-44`
          adds the wider AAA 2.5.5 area on top of it for those.
        */}
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex items-center rounded-full transition-colors motion-feedback",
            resolveResponsive(size, SWITCH_TRACK),
            checked ? "bg-primary-500" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 transition-transform motion-feedback ease-in-out",
              resolveResponsive(size, SWITCH_THUMB),
              checked ? resolveResponsive(size, SWITCH_THUMB_TRANSLATE) : "translate-x-0",
            )}
          />
        </span>
      </button>
      {label ? (
        <label
          id={labelId}
          htmlFor={switchId}
          onClick={(event) => {
            event.preventDefault();
            if (!disabled) onCheckedChange(!checked);
          }}
          className={cn("font-medium", disabled ? "cursor-not-allowed" : "cursor-pointer")}
        >
          {label}
        </label>
      ) : null}
    </span>
  );
}
