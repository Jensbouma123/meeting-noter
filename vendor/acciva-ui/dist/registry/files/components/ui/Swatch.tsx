import { type HTMLAttributes } from "react";
import { formatColor, parseColor } from "@/lib/color/formats/index";
import { cn } from "@/lib/utils";

export type SwatchSize = "xs" | "sm" | "md" | "lg";

export const SWATCH_SIZE_CLASS: Record<SwatchSize, string> = {
  xs: "size-4",
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
};

export interface SwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Any `parseColor` input. Parsed and re-serialized; the raw string never reaches CSS. */
  color: string;
  /** Absent → decorative (`aria-hidden`). Present → `role="img"` + `aria-label`. */
  label?: string;
  size?: SwatchSize;
}

export interface LegendItemProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  color: string;
  /** The colour's name; combines with `caption` into the single accessible name. */
  label?: string;
  /** Visible caption text. */
  caption: string;
  size?: SwatchSize;
}

function serializedColor(color: string): string | null {
  const rgba = parseColor(color);
  return rgba ? formatColor(rgba, "rgb") : null;
}

function warnInvalid(color: string) {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[a11y] <Swatch> received an unparseable \`color\` ("${color}"); rendering a dashed placeholder. Pass a parseColor input (#rgb, #rrggbb, rgb(), hsl(), oklch()) (WCAG 2.2 AA SC 1.1.1 Non-text Content).`,
    );
  }
}

export function Swatch({ color, label, size = "md", className, ...rest }: SwatchProps) {
  const fill = serializedColor(color);
  if (fill === null) warnInvalid(color);
  const labelled = label !== undefined && label.trim() !== "";
  return (
    <span
      {...(labelled ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...rest}
      style={{ ...rest.style, backgroundColor: fill ?? undefined }}
      className={cn(
        "inline-block shrink-0 rounded-full border",
        SWATCH_SIZE_CLASS[size],
        fill === null ? "border-dashed border-border bg-transparent" : "border-border",
        className,
      )}
    />
  );
}

export function LegendItem({ color, label, caption, size = "md", className, ...rest }: LegendItemProps) {
  const trimmed = label?.trim();
  const name = trimmed ? `${trimmed}, ${caption}` : caption;
  return (
    <span
      role="img"
      aria-label={name}
      {...rest}
      className={cn("inline-flex min-w-0 items-center gap-2", className)}
    >
      <Swatch color={color} size={size} aria-hidden="true" />
      <span aria-hidden="true" className="truncate text-sm text-foreground">
        {caption}
      </span>
    </span>
  );
}
