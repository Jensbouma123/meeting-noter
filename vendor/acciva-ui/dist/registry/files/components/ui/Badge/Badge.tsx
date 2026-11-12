import type { HTMLAttributes } from "react";
import {
  BADGE_GAP,
  BADGE_ICON_SCALE_CLASS,
  BADGE_PADDING,
  BADGE_TEXT,
  CONTROL_HEIGHT,
  CONTROL_PADDING_X,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import {
  CHIP_PADDING_RIGHT_WITH_DISMISS,
  chipDotClasses,
  chipStateClasses,
  dotClasses,
  tintClasses,
  toneClasses,
} from "@/components/ui/Badge/classes";
import { BadgeDismiss, BadgeDot } from "@/components/ui/Badge/BadgeParts";
import { resolveDismissLabel } from "@/components/ui/Badge/dismissLabel";
import type { BadgeProps } from "@/components/ui/Badge/types";

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  tint,
  selected = false,
  onSelect,
  onDismiss,
  dismissLabel,
  disabled = false,
  children,
  ...props
}: BadgeProps) {
  if (variant !== "chip") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          tint ? ["text-foreground border", tintClasses[tint].surface] : toneClasses[variant],
          resolveResponsive(size, BADGE_PADDING),
          resolveResponsive(size, BADGE_TEXT),
          resolveResponsive(size, BADGE_GAP),
          resolveResponsive(size, BADGE_ICON_SCALE_CLASS),
          className,
        )}
        {...props}
      >
        {dot && <BadgeDot className={tint ? tintClasses[tint].dot : dotClasses[variant]} />}
        {children}
      </span>
    );
  }

  const dotNode = dot ? <BadgeDot className={chipDotClasses[selected ? "selected" : "unselected"]} /> : null;

  const pillClassName = cn(
    "inline-flex shrink-0 items-center rounded-full border font-medium transition-colors",
    resolveResponsive(size, CONTROL_HEIGHT),
    resolveResponsive(size, CONTROL_PADDING_X),
    resolveResponsive(size, BADGE_TEXT),
    resolveResponsive(size, BADGE_GAP),
    resolveResponsive(size, BADGE_ICON_SCALE_CLASS),
    chipStateClasses[selected ? "selected" : "unselected"],
    "disabled:cursor-not-allowed disabled:opacity-60",
    disabled && "cursor-not-allowed opacity-60",
    onDismiss && resolveResponsive(size, CHIP_PADDING_RIGHT_WITH_DISMISS),
    className,
  );

  // A chip that only toggles IS the button, so the whole pill is one target. Add a dismiss
  // control and the pill becomes a plain container instead — two sibling buttons, never one
  // interactive element nested inside another.
  if (onSelect && !onDismiss) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelect(!selected)}
        className={cn(
          "focus-ring",
          pillClassName,
          typeof size === "string"
            ? touchTargetClass(size)
            : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
              ? TOUCH_TARGET_CLASS
              : undefined,
        )}
        {...(props as HTMLAttributes<HTMLButtonElement>)}
      >
        {dotNode}
        {children}
      </button>
    );
  }

  return (
    <span className={pillClassName} {...props}>
      {onSelect ? (
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => onSelect(!selected)}
          className={cn(
            "focus-ring inline-flex items-center self-stretch rounded-full disabled:cursor-not-allowed",
            resolveResponsive(size, BADGE_GAP),
          )}
        >
          {dotNode}
          {children}
        </button>
      ) : (
        <>
          {dotNode}
          {children}
        </>
      )}
      {onDismiss ? (
        <BadgeDismiss
          label={resolveDismissLabel(dismissLabel, children)}
          size={size}
          disabled={disabled}
          onDismiss={onDismiss}
        />
      ) : null}
    </span>
  );
}
