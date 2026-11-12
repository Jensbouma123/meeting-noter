import {
  CONTROL_HEIGHT,
  CONTROL_RADIUS,
  INPUT_PADDING_X,
  INPUT_ICON_PADDING_LEADING,
  TEXT_SIZE,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export function triggerClassName(
  size: ResponsiveSize<SizeTier>,
  disabled: boolean,
  readOnly: boolean,
  error: string | undefined,
) {
  return cn(
    "focus-ring relative flex w-full items-center border bg-background text-left text-foreground transition-colors motion-feedback",
    disabled && "cursor-not-allowed bg-elevation-2 opacity-60",
    readOnly && "cursor-default bg-elevation-1",
    error ? "border-danger focus-visible:ring-danger" : "border-border hover:border-muted-foreground/60",
    resolveResponsive(size, CONTROL_HEIGHT),
    resolveResponsive(size, CONTROL_RADIUS),
    resolveResponsive(size, TEXT_SIZE),
    resolveResponsive(size, INPUT_PADDING_X),
    resolveResponsive(size, INPUT_ICON_PADDING_LEADING),
    typeof size === "string"
      ? touchTargetClass(size)
      : [size.base, size.sm, size.md, size.lg].some((tier) => tier !== undefined && needsTouchTarget(tier))
        ? TOUCH_TARGET_CLASS
        : undefined,
  );
}
