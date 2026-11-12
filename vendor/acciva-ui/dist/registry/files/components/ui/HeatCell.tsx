import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface HeatCellProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "role" | "aria-label" | "aria-hidden"> {
  /** Ratio `0..1`, clamped. Quantised to five opacity steps. */
  intensity?: number;
  /** No data: neutral empty fill, `intensity` ignored. */
  isEmpty?: boolean;
  /** Accessible name naming the value. Required for data cells (SC 1.4.1). Omit only when decorative. */
  label?: string;
}

// Fixed opacity multipliers, not tokens. Mirrored in apple/Sources/AccivaUI/Components/HeatCell.swift.
const stepClasses = [
  "bg-brand-foreground/20",
  "bg-brand-foreground/40",
  "bg-brand-foreground/60",
  "bg-brand-foreground/80",
  "bg-brand-foreground",
] as const;

function stepFor(intensity: number): number {
  const clamped = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0;
  return Math.min(stepClasses.length - 1, Math.floor(clamped * stepClasses.length));
}

/**
 * One heatmap cell. With `label` it is an image with a text alternative; without, it is decorative
 * and the grid must be explained in text (SC 1.4.1, 1.1.1).
 */
export function HeatCell({ intensity = 0, isEmpty = false, label, className, ...props }: HeatCellProps) {
  const fill = isEmpty ? "bg-border-subtle" : stepClasses[stepFor(intensity)];
  const labelled = label !== undefined;

  return (
    <span
      {...props}
      role={labelled ? "img" : undefined}
      aria-label={label}
      aria-hidden={labelled ? undefined : "true"}
      className={cn("block aspect-square w-full rounded-sm", fill, className)}
    />
  );
}
