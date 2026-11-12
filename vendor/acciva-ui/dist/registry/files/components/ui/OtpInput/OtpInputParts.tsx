import {
  CONTROL_RADIUS,
  TEXT_SIZE,
  TOUCH_TARGET_CLASS,
  needsTouchTarget,
  resolveResponsive,
  touchTargetClass,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

const OTP_BOX_SIZE: Record<SizeTier, string> = {
  xxs: "size-7",
  xs: "size-8",
  sm: "size-9",
  md: "size-11",
  lg: "size-12",
  xl: "size-14",
  "2xl": "size-16",
  "3xl": "size-18",
};

export function OtpInputBox({
  char,
  isBoxFocused,
  isInvalid,
  mask,
  disabled,
  readOnly,
  size,
  onSelect,
}: {
  char: string;
  isBoxFocused: boolean;
  isInvalid: boolean;
  mask: boolean;
  disabled: boolean;
  readOnly: boolean;
  size: ResponsiveSize<SizeTier>;
  onSelect: () => void;
}) {
  return (
    <div
      role="presentation"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-center font-mono font-bold text-center border transition-all motion-feedback select-none cursor-text",
        resolveResponsive(size, OTP_BOX_SIZE),
        resolveResponsive(size, CONTROL_RADIUS),
        resolveResponsive(size, TEXT_SIZE),
        isBoxFocused
          ? "border-focus-ring ring-2 ring-focus-ring/30"
          : isInvalid
            ? "border-danger text-danger"
            : char
              ? "border-foreground/30 text-foreground bg-background"
              : "border-border text-muted-foreground bg-background hover:border-muted-foreground/60 active:border-foreground active:bg-elevation-1",
        disabled && "cursor-not-allowed opacity-60 bg-elevation-2",
        readOnly && "cursor-default bg-elevation-1",
        typeof size === "string"
          ? touchTargetClass(size)
          : [size.base, size.sm, size.md, size.lg].some(
              (tier) => tier !== undefined && needsTouchTarget(tier),
            )
            ? TOUCH_TARGET_CLASS
            : undefined,
      )}
    >
      {mask && char ? "•" : char}
      {isBoxFocused && !char && (
        <span
          className="w-0.5 h-4 bg-focus-ring animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function OtpInputMessage({
  error,
  hint,
  errorId,
  hintId,
}: {
  error?: string;
  hint?: string;
  errorId?: string;
  hintId?: string;
}) {
  return (
    <div className="min-w-0">
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-danger animate-fade-in"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
