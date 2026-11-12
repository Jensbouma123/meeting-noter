"use client";

import { useId, type HTMLAttributes } from "react";
import {
  SLIDER_ROW_HEIGHT,
  SLIDER_THUMB_SIZE,
  SLIDER_THUMB_TARGET,
  SLIDER_TRACK_HEIGHT,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { SliderLabel } from "@/components/ui/Slider/SliderParts";
import { useSliderKeys } from "@/components/ui/Slider/useSliderKeys";
import { useSliderPointer } from "@/components/ui/Slider/useSliderPointer";

export interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange" | "onKeyDown"> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  size?: ResponsiveSize<SizeTier>;
  /** Merged onto the root wrapper that holds the label row and the track. */
  className?: string;
  "aria-label"?: string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  onChange,
  formatValue,
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  const sliderId = useId();
  const percent = ((value - min) / (max - min)) * 100;
  const range = { min, max, step, disabled, onChange };
  const { trackRef, thumbRef, handlePointerDown } = useSliderPointer(range);
  const handleKeyDown = useSliderKeys({ ...range, value });

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)} {...props}>
      {label ? (
        <SliderLabel id={`${sliderId}-label`} label={label} readout={formatValue ? formatValue(value) : value} size={size} />
      ) : null}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={cn(
          "relative w-full cursor-pointer touch-none",
          resolveResponsive(size, SLIDER_ROW_HEIGHT),
          typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
              ? TOUCH_TARGET_CLASS
              : undefined,
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className={cn("absolute top-1/2 w-full -translate-y-1/2 rounded-full bg-muted-foreground/20", resolveResponsive(size, SLIDER_TRACK_HEIGHT))} />
        <div
          className={cn("absolute top-1/2 -translate-y-1/2 rounded-full bg-primary-500", resolveResponsive(size, SLIDER_TRACK_HEIGHT))}
          style={{ width: `${percent}%` }}
        />
        <div
          ref={thumbRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-orientation="horizontal"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue ? formatValue(value) : undefined}
          aria-labelledby={label ? `${sliderId}-label` : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-disabled={disabled || undefined}
          onKeyDown={handleKeyDown}
          className={cn(
            "focus-ring absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
            resolveResponsive(size, SLIDER_THUMB_TARGET),
          )}
          style={{ left: `${percent}%` }}
        >
          {/*
            SC 2.5.8 Target Size (Minimum) sizes the pointer target, not the paint:
            the element above is never under 24x24, while the circle below keeps the
            tier's designed diameter. Splitting them is what lets `md` (a 20px thumb)
            meet the floor without growing visually.
          */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none block rounded-full border-2 border-primary-500 bg-white shadow",
              resolveResponsive(size, SLIDER_THUMB_SIZE),
            )}
          />
        </div>
      </div>
    </div>
  );
}
