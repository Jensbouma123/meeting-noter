import type { HTMLAttributes } from "react";
import {
  BADGE_GAP,
  BADGE_TEXT,
  resolveResponsive,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export type StatusDotTone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  /** Semantic colour role, never a colour name. */
  tone?: StatusDotTone;
  /** Accessible name — the state in words. Required so the dot is never colour alone. */
  label: string;
  /** Dot diameter tier. Defaults to `xs` (8px), the audit's `Spacing.xs` dot. */
  size?: ResponsiveSize<SizeTier>;
  /** Radiating ring for ongoing activity. Static under reduced motion. */
  pulse?: boolean;
  /** Renders `label` as visible text beside the dot. */
  showLabel?: boolean;
}

const toneClasses: Record<StatusDotTone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  brand: "bg-primary-500",
};

// Dot diameters on the default spacing scale (6px–24px), mirroring the Swift
// `AccivaStatusDot.diameter(for:)` multiples of `Spacing.unit`.
const DOT_SIZE: Record<SizeTier, string> = {
  xxs: "size-1.5",
  xs: "size-2",
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
  xl: "size-4",
  "2xl": "size-5",
  "3xl": "size-6",
};

/**
 * A small presence/status dot with a required accessible name. `role="img"` names it via
 * `aria-label`; the dot (and the optional visible label text) are presentational children,
 * so the name announces exactly once (SC 4.1.2). Not a control — never attach `onClick`.
 */
export function StatusDot({
  tone = "neutral",
  label,
  size = "xs",
  pulse = false,
  showLabel = false,
  className,
  ...props
}: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center",
        showLabel && [
          resolveResponsive(size, BADGE_GAP),
          resolveResponsive(size, BADGE_TEXT),
          "font-medium text-muted-foreground",
        ],
        className,
      )}
      {...props}
    >
      {pulse ? (
        <span className="relative inline-flex shrink-0">
          <span
            aria-hidden="true"
            // Ring peak is PULSE_PEAK_OPACITY (opacity-tokens); spelled as a literal
            // so Tailwind compiles it verbatim.
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none",
              toneClasses[tone],
            )}
          />
          <span
            aria-hidden="true"
            className={cn("relative inline-flex rounded-full", resolveResponsive(size, DOT_SIZE), toneClasses[tone])}
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={cn("inline-flex shrink-0 rounded-full", resolveResponsive(size, DOT_SIZE), toneClasses[tone])}
        />
      )}
      {showLabel && (
        <span aria-hidden="true" className="truncate">
          {label}
        </span>
      )}
    </span>
  );
}
